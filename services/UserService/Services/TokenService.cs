// services/UserService/Services/TokenService.cs
// CHANGES from Phase 1 version:
//   - GenerateTokenPair() replaces GenerateToken() — returns both access + refresh token
//   - GenerateToken() kept as a backward-compatible wrapper
//   - RefreshAsync() validates and rotates the refresh token
//   - RevokeAllAsync() for logout and theft response
//   - Uses IHttpContextAccessor to capture client IP

using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using UserService.Data;
using UserService.Models;

namespace UserService.Services;

public interface ITokenService
{
    TokenResponse GenerateToken(User user, VerificationStatus? verificationStatus = null);
    Task<TokenPairResponse> GenerateTokenPairAsync(User user, VerificationStatus? verificationStatus, string clientIp);
    Task<TokenPairResponse?> RefreshAsync(string refreshToken, string clientIp);
    Task RevokeAllAsync(int userId, string reason);
    ClaimsPrincipal? ValidateToken(string token);
}

public class TokenService(
    IConfiguration config,
    UserDbContext db,
    IHttpContextAccessor http) : ITokenService
{
    private string Secret => config["Jwt:Secret"] ?? throw new InvalidOperationException("Jwt:Secret not configured");
    private string Issuer => config["Jwt:Issuer"] ?? "UserService";
    private string Audience => config["Jwt:Audience"] ?? "DevHub";
    private int ExpiryMins => int.TryParse(config["Jwt:ExpiryMinutes"], out var m) ? m : 60;
    private int RefreshDays => int.TryParse(config["Jwt:RefreshTokenDays"], out var d) ? d : 7;

    // ── Backward-compatible wrapper (used by admin user creation etc.) ─────────
    public TokenResponse GenerateToken(User user, VerificationStatus? verificationStatus = null)
    {
        var claims = BuildClaims(user, verificationStatus);
        var expiry = DateTime.UtcNow.AddMinutes(ExpiryMins);
        var accessToken = WriteToken(claims, expiry);

        return new TokenResponse
        {
            AccessToken = accessToken,
            TokenType = "Bearer",
            ExpiresInSeconds = ExpiryMins * 60,
            UserId = user.Id,
            UserName = user.Name,
            Role = user.Role,
            Email = user.Email,
            VerificationStatus = verificationStatus?.ToString()
        };
    }

    // ── Full token pair (access + refresh) ────────────────────────────────────
    public async Task<TokenPairResponse> GenerateTokenPairAsync(
        User user,
        VerificationStatus? verificationStatus,
        string clientIp)
    {
        var claims = BuildClaims(user, verificationStatus);
        var expiry = DateTime.UtcNow.AddMinutes(ExpiryMins);
        var accessToken = WriteToken(claims, expiry);

        var refresh = await _createRefreshTokenAsync(user.Id, clientIp);

        return new TokenPairResponse
        {
            AccessToken = accessToken,
            RefreshToken = refresh.Token,
            TokenType = "Bearer",
            ExpiresInSeconds = ExpiryMins * 60,
            RefreshExpiresAt = refresh.ExpiresAt,
            UserId = user.Id,
            UserName = user.Name,
            Role = user.Role,
            Email = user.Email,
            VerificationStatus = verificationStatus?.ToString()
        };
    }

    // ── Refresh token rotation ────────────────────────────────────────────────
    public async Task<TokenPairResponse?> RefreshAsync(string refreshToken, string clientIp)
    {
        var token = await db.RefreshTokens
            .Include(t => t.User)
            .FirstOrDefaultAsync(t => t.Token == refreshToken);

        if (token is null) return null;

        // Token reuse detection — if someone presents an already-used token,
        // revoke ALL tokens for this user immediately (indicates theft)
        if (token.IsUsed)
        {
            await RevokeAllAsync(token.UserId, "Token reuse detected — possible theft");
            return null;
        }

        if (!token.IsActive) return null;

        // Rotate: mark current token as used
        token.IsUsed = true;
        token.UsedAt = DateTime.UtcNow;

        // Issue a fresh pair
        var user = token.User;
        var claims = BuildClaims(user, null);  // verification status re-read at login
        var expiry = DateTime.UtcNow.AddMinutes(ExpiryMins);
        var accessToken = WriteToken(claims, expiry);
        var newRefresh = await _createRefreshTokenAsync(user.Id, clientIp);

        await db.SaveChangesAsync();

        return new TokenPairResponse
        {
            AccessToken = accessToken,
            RefreshToken = newRefresh.Token,
            TokenType = "Bearer",
            ExpiresInSeconds = ExpiryMins * 60,
            RefreshExpiresAt = newRefresh.ExpiresAt,
            UserId = user.Id,
            UserName = user.Name,
            Role = user.Role,
            Email = user.Email
        };
    }

    // ── Revoke all tokens (logout / theft response) ───────────────────────────
    public async Task RevokeAllAsync(int userId, string reason)
    {
        await db.RefreshTokens
            .Where(t => t.UserId == userId && !t.IsRevoked)
            .ExecuteUpdateAsync(s => s
                .SetProperty(t => t.IsRevoked, true)
                .SetProperty(t => t.RevokedAt, DateTime.UtcNow)
                .SetProperty(t => t.RevokedReason, reason));
    }

    public ClaimsPrincipal? ValidateToken(string token)
    {
        try
        {
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(Secret));
            return new JwtSecurityTokenHandler().ValidateToken(token, new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = key,
                ValidateIssuer = true,
                ValidIssuer = Issuer,
                ValidateAudience = true,
                ValidAudience = Audience,
                ClockSkew = TimeSpan.Zero
            }, out _);
        }
        catch { return null; }
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private List<Claim> BuildClaims(User user, VerificationStatus? verificationStatus)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Email,           user.Email),
            new(ClaimTypes.Name,            user.Name),
            new(ClaimTypes.Role,            user.Role),
            new("department",               user.Department ?? string.Empty),
            new("role",                     user.Role),
        };

        if (user.Role == "Seller" && verificationStatus.HasValue)
            claims.Add(new Claim("verificationStatus", verificationStatus.Value.ToString()));

        return claims;
    }

    private string WriteToken(List<Claim> claims, DateTime expiry)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(Secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(
            issuer: Issuer,
            audience: Audience,
            claims: claims,
            expires: expiry,
            signingCredentials: creds
        );
        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private async Task<RefreshToken> _createRefreshTokenAsync(int userId, string clientIp)
    {
        var token = new RefreshToken
        {
            UserId = userId,
            Token = Convert.ToHexString(RandomNumberGenerator.GetBytes(64)),
            ExpiresAt = DateTime.UtcNow.AddDays(RefreshDays),
            CreatedAt = DateTime.UtcNow,
            CreatedByIp = clientIp
        };
        db.RefreshTokens.Add(token);
        await db.SaveChangesAsync();
        return token;
    }
}

// ── Response DTOs ─────────────────────────────────────────────────────────────

public class TokenPairResponse : TokenResponse
{
    public string RefreshToken { get; set; } = string.Empty;
    public DateTime RefreshExpiresAt { get; set; }
}
