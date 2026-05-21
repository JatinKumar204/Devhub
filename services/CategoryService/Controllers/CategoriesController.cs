using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using CategoryService.Models;
using CategoryService.Repositories;
using System.Security.Claims;

namespace CategoryService.Controllers;

[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public class CategoriesController(ICategoryRepository repo, ILogger<CategoriesController> logger) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] bool? isActive = true) =>
        Ok(await repo.GetTopLevelAsync());

    [HttpGet("all")]
    public async Task<IActionResult> GetAllFlat([FromQuery] bool? isActive = null) =>
        Ok(await repo.GetAllAsync(isActive));

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var cat = await repo.GetByIdAsync(id);
        return cat is null ? NotFound(new { message = $"Category {id} not found" }) : Ok(cat);
    }

    [HttpGet("slug/{slug}")]
    public async Task<IActionResult> GetBySlug(string slug)
    {
        var cat = await repo.GetBySlugAsync(slug);
        return cat is null ? NotFound(new { message = $"Category '{slug}' not found" }) : Ok(cat);
    }

    // FIXED: Allow Seller role to create categories for their store, not just Admin
    [HttpPost]
    [Authorize(Roles = "Admin,Seller")]
    public async Task<IActionResult> Create([FromBody] CreateCategoryDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name) || string.IsNullOrWhiteSpace(dto.Slug))
            return BadRequest(new { message = "Name and Slug are required" });

        // Check for duplicate slug
        if (await repo.GetBySlugAsync(dto.Slug) is not null)
            return Conflict(new { message = $"Slug '{dto.Slug}' already exists" });

        var caller = User.FindFirstValue(ClaimTypes.Name) ?? "unknown";
        var cat = await repo.CreateAsync(dto, caller);
        logger.LogInformation("Category {Id} created: {Name} by {Caller}", cat.Id, cat.Name, caller);
        return CreatedAtAction(nameof(GetById), new { id = cat.Id }, cat);
    }

    // FIXED: Allow Seller role to update categories
    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin,Seller")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateCategoryDto dto)
    {
        var caller = User.FindFirstValue(ClaimTypes.Name) ?? "unknown";
        var cat = await repo.UpdateAsync(id, dto, caller);
        if (cat is null) return NotFound(new { message = $"Category {id} not found" });
        return Ok(cat);
    }

    // Keep Delete as Admin-only — destructive action
    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        if (!await repo.DeleteAsync(id))
            return NotFound(new { message = $"Category {id} not found" });
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
        service = "CategoryService",
        status = "healthy",
        timestamp = DateTime.UtcNow,
        version = "1.0.0"
    });
}
