using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UserService.Models;
using UserService.Repositories;
using UserService.Services;

namespace UserService.Controllers;

[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public class UsersController(IUserRepository repo, ILogger<UsersController> logger) : ControllerBase
{
    [HttpGet]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? search = null,
        [FromQuery] bool? isActive = null)
    {
        var users = await repo.GetAllAsync(page, pageSize, search, isActive);
        return Ok(users);
    }

    [HttpGet("active")]
    [Authorize]
    public async Task<IActionResult> GetActive() =>
        Ok(await repo.GetActiveAsync());

    [HttpGet("stats")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetStats() =>
        Ok(await repo.GetStatsAsync());

    [HttpGet("{id:int}")]
    [Authorize]
    public async Task<IActionResult> GetById(int id)
    {
        // Users can only view their own profile unless Admin
        var callerId = int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var cid) ? cid : 0;
        if (!User.IsInRole("Admin") && callerId != id)
            return Forbid();

        var user = await repo.GetByIdAsync(id);
        if (user is null) return NotFound(new { message = $"User {id} not found" });
        return Ok(user);
    }

    // Admin-only create (register endpoint is public and handled in AuthController)
    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] CreateUserDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name) || string.IsNullOrWhiteSpace(dto.Email))
            return BadRequest(new { message = "Name and Email are required" });

        var existing = await repo.GetByEmailAsync(dto.Email);
        if (existing is not null) return Conflict(new { message = "Email already registered" });

        var user = await repo.CreateAsync(dto);
        logger.LogInformation("User {Id} created: {Email}", user.Id, user.Email);
        return CreatedAtAction(nameof(GetById), new { id = user.Id }, user);
    }

    [HttpPut("{id:int}")]
    [Authorize]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateUserDto dto)
    {
        // Users can only update their own profile; Admins can update anyone
        var callerId = int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var cid) ? cid : 0;
        if (!User.IsInRole("Admin") && callerId != id)
            return Forbid();

        // Non-admins cannot change their own role
        var safeDto = User.IsInRole("Admin") ? dto : dto with { Role = null };

        var caller = User.FindFirstValue(ClaimTypes.Name) ?? "unknown";
        var user = await repo.UpdateAsync(id, safeDto, caller);
        if (user is null) return NotFound(new { message = $"User {id} not found" });
        logger.LogInformation("User {Id} updated by {Caller}", id, caller);
        return Ok(user);
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        if (!await repo.DeleteAsync(id)) return NotFound(new { message = $"User {id} not found" });
        logger.LogInformation("User {Id} deleted", id);
        return NoContent();
    }
}
[ApiController]
[Route("api/[controller]")]
public class HealthController : ControllerBase
{
    [HttpGet]
    public IActionResult Get() => Ok(new
    {
        service = "UserService",
        status = "healthy",
        timestamp = DateTime.UtcNow,
        version = "3.0.0"
    });
}
