using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using UserService.Models;

namespace UserService.Services;

public interface ITokenService
{
    TokenResponse GenerateToken(User user);
    ClaimsPrincipal? ValidateToken(string token);
}

public class TokenService(IConfiguration config) : ITokenService
{
    // Resolved lazily so EF design-time host can start without config values present
    private string Secret => config["Jwt:Secret"] ?? throw new InvalidOperationException("Jwt:Secret is not configured");
    private string Issuer => config["Jwt:Issuer"] ?? "UserService";
    private string Audience => config["Jwt:Audience"] ?? "DevHub";
    private int ExpiryMins => int.TryParse(config["Jwt:ExpiryMinutes"], out var m) ? m : 60;

    public TokenResponse GenerateToken(User user)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(Secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Email,           user.Email),
            new Claim(ClaimTypes.Name,            user.Name),
            new Claim(ClaimTypes.Role,            user.Role),
            new Claim("department",               user.Department),
            // FIXED: plain "role" claim so Angular can read it directly from JWT payload
            new Claim("role",                     user.Role),
        };

        var token = new JwtSecurityToken(
            issuer: Issuer,
            audience: Audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(ExpiryMins),
            signingCredentials: creds
        );

        return new TokenResponse
        {
            AccessToken = new JwtSecurityTokenHandler().WriteToken(token),
            TokenType = "Bearer",
            ExpiresInSeconds = ExpiryMins * 60,
            UserId = user.Id,
            UserName = user.Name,
            Role = user.Role,
            Email = user.Email,
        };
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
        catch
        {
            return null;
        }
    }
}
