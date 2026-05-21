// Controllers/AuthExtensionsController.cs — ADD TO UserService
// This extends the existing auth controller with change-password support.
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UserService.Data;
using System.Security.Claims;

namespace UserService.Controllers;

public record ChangePasswordDto(string CurrentPassword, string NewPassword, string ConfirmPassword);

[ApiController]
[Route("api/auth")]
[Authorize]
[Produces("application/json")]
public class AuthExtensionsController(UserDbContext db) : ControllerBase
{
    private int UserId => int.Parse(
        User.FindFirstValue(ClaimTypes.NameIdentifier)
        ?? throw new UnauthorizedAccessException());

    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDto dto)
    {
        if (dto.NewPassword != dto.ConfirmPassword)
            return BadRequest(new { message = "New passwords do not match" });

        if (dto.NewPassword.Length < 6)
            return BadRequest(new { message = "Password must be at least 6 characters" });

        var user = await db.Users.FindAsync(UserId);
        if (user is null) return NotFound();

        // Verify current password using BCrypt
        if (!BCrypt.Net.BCrypt.Verify(dto.CurrentPassword, user.PasswordHash))
            return BadRequest(new { message = "Current password is incorrect" });

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
        await db.SaveChangesAsync();

        return Ok(new { message = "Password changed successfully" });
    }
}
