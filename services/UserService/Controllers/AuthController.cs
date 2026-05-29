// services/UserService/Controllers/AuthController.cs  (was inside UsersController.cs)
// Extracted to its own file for clarity.
//
// Changes from previous version:
//   - Register endpoint now accepts optional SellerRegistrationDto for Seller role
//   - Sellers get VerificationStatus=PendingApproval and cannot login until...
//     actually they CAN login — but the JWT now includes verificationStatus claim
//     so ProductService can gate product creation behind Approved status
//   - Buyers still auto-approved and can login immediately — unchanged
//   - Login logic is completely unchanged

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using UserService.Models;
using UserService.Repositories;
using UserService.Services;

namespace UserService.Controllers;

[ApiController]
[Route("api/auth")]
[Produces("application/json")]
public class AuthController(
    IUserRepository userRepo,
    ISellerVerificationRepository verificationRepo,
    ITokenService tokenService,
    ILogger<AuthController> logger) : ControllerBase
{
    private string ClientIp =>
    HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
    // ── Login (UNCHANGED) ─────────────────────────────────────────────────────



    // ── Login ─────────────────────────────────────────────────────────────────

    [HttpPost("login")]
    [Microsoft.AspNetCore.RateLimiting.EnableRateLimiting("auth")]
    public async Task<IActionResult> Login([FromBody] LoginDto dto)
    {
        var user = await userRepo.GetByEmailAsync(dto.Email);
        if (user is null || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
        {
            logger.LogWarning("Failed login attempt for {Email} from {Ip}", dto.Email, ClientIp);
            return Unauthorized(new { message = "Invalid credentials" });
        }

        if (!user.IsActive)
            return Forbid();

        await userRepo.UpdateLastLoginAsync(user.Id);

        VerificationStatus? verificationStatus = null;
        if (user.Role == "Seller")
        {
            var isApproved = await verificationRepo.IsApprovedAsync(user.Id);
            verificationStatus = isApproved
                ? VerificationStatus.Approved
                : (await verificationRepo.GetByUserIdAsync(user.Id))?.Status
                  ?? VerificationStatus.PendingApproval;
        }

        // CHANGED: issue full token pair
        var tokenPair = await tokenService.GenerateTokenPairAsync(
            user, verificationStatus, ClientIp);

        logger.LogInformation("Login: {Email} role={Role} from {Ip}", user.Email, user.Role, ClientIp);
        return Ok(tokenPair);
    }

    // ── Register ──────────────────────────────────────────────────────────────

    [HttpPost("register")]
    [Microsoft.AspNetCore.RateLimiting.EnableRateLimiting("auth")]
    public async Task<IActionResult> Register([FromBody] FullRegisterDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name) ||
            string.IsNullOrWhiteSpace(dto.Email) ||
            string.IsNullOrWhiteSpace(dto.Password))
            return BadRequest(new { message = "Name, Email, and Password are required." });

        if (dto.Password.Length < 6)
            return BadRequest(new { message = "Password must be at least 6 characters." });

        var existing = await userRepo.GetByEmailAsync(dto.Email);
        if (existing is not null)
            return Conflict(new { message = "Email already registered." });

        var role = dto.Role == "Seller" ? "Seller" : "Buyer";

        if (role == "Seller")
        {
            if (dto.SellerProfile is null)
                return BadRequest(new { message = "Seller registration requires store profile details." });
            if (string.IsNullOrWhiteSpace(dto.SellerProfile.StoreName))
                return BadRequest(new { message = "Store name is required for Seller registration." });
            if (string.IsNullOrWhiteSpace(dto.SellerProfile.PhoneNumber))
                return BadRequest(new { message = "Phone number is required for Seller registration." });
            if (string.IsNullOrWhiteSpace(dto.SellerProfile.AddressLine1) ||
                string.IsNullOrWhiteSpace(dto.SellerProfile.City) ||
                string.IsNullOrWhiteSpace(dto.SellerProfile.Province) ||
                string.IsNullOrWhiteSpace(dto.SellerProfile.PostalCode))
                return BadRequest(new { message = "Full address is required for Seller registration." });
        }

        var createDto = new CreateUserDto(dto.Name, dto.Email, dto.Password, role, dto.Department ?? string.Empty);
        var user = await userRepo.CreateAsync(createDto);

        VerificationStatus? verificationStatus = null;
        if (role == "Seller")
        {
            await verificationRepo.CreateAsync(user.Id, dto.SellerProfile!, user.Name);
            verificationStatus = VerificationStatus.PendingApproval;
            logger.LogInformation("Seller registered: {Email} — verification pending", user.Email);
        }
        else
        {
            logger.LogInformation("Buyer registered: {Email}", user.Email);
        }

        var tokenPair = await tokenService.GenerateTokenPairAsync(
            user, verificationStatus, ClientIp);

        return StatusCode(201, new
        {
            message = role == "Seller"
                ? "Registration successful. Your account is pending admin approval."
                : "Registration successful.",
            role,
            verificationStatus = verificationStatus?.ToString(),
            token = tokenPair   // keep "token" key for Angular compatibility
        });
    }

    // ── NEW: Refresh token ────────────────────────────────────────────────────

    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh([FromBody] RefreshTokenDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.RefreshToken))
            return BadRequest(new { message = "Refresh token is required." });

        var result = await tokenService.RefreshAsync(dto.RefreshToken, ClientIp);

        if (result is null)
            return Unauthorized(new { message = "Invalid, expired, or already-used refresh token. Please log in again." });

        return Ok(result);
    }

    // ── NEW: Logout ───────────────────────────────────────────────────────────

    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout([FromBody] RefreshTokenDto? dto)
    {
        var userId = int.TryParse(
            User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : 0;

        await tokenService.RevokeAllAsync(userId, "User logout");
        logger.LogInformation("User {UserId} logged out, all refresh tokens revoked", userId);

        return Ok(new { message = "Logged out successfully." });
    }

    // ── Health (unchanged) ────────────────────────────────────────────────────

    [HttpGet("~/api/health")]
    public IActionResult Health() => Ok(new
    {
        service   = "UserService",
        status    = "healthy",
        timestamp = DateTime.UtcNow,
        version   = "3.0.0"
    });
}

public record RefreshTokenDto(string RefreshToken);

public record FullRegisterDto(
    string Name,
    string Email,
    string Password,
    string Role = "Buyer",
    string? Department = null,
    SellerRegistrationDto? SellerProfile = null
);
