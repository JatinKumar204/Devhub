// Controllers/AddressesController.cs  — ADD TO UserService
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UserService.Data;
using System.Security.Claims;

namespace UserService.Controllers;

public class Address
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string Label { get; set; } = "Home";
    public string FullName { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string AddressLine1 { get; set; } = string.Empty;
    public string? AddressLine2 { get; set; }
    public string City { get; set; } = string.Empty;
    public string State { get; set; } = string.Empty;
    public string PostalCode { get; set; } = string.Empty;
    public string Country { get; set; } = "Pakistan";
    public bool IsDefault { get; set; }
    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;
}

public record CreateAddressDto(
    string Label,
    string FullName,
    string Phone,
    string AddressLine1,
    string? AddressLine2,
    string City,
    string State,
    string PostalCode,
    string Country = "Pakistan");

[ApiController]
[Route("api/[controller]")]
[Authorize]
[Produces("application/json")]
public class AddressesController(UserDbContext db) : ControllerBase
{
    private int UserId => int.Parse(
        User.FindFirstValue(ClaimTypes.NameIdentifier)
        ?? throw new UnauthorizedAccessException());

    [HttpGet]
    public async Task<IActionResult> GetMyAddresses() =>
        Ok(await db.Set<Address>()
            .Where(a => a.UserId == UserId)
            .OrderByDescending(a => a.IsDefault)
            .ThenByDescending(a => a.CreatedDate)
            .ToListAsync());

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateAddressDto dto)
    {
        var address = new Address
        {
            UserId = UserId,
            Label = dto.Label,
            FullName = dto.FullName,
            Phone = dto.Phone,
            AddressLine1 = dto.AddressLine1,
            AddressLine2 = dto.AddressLine2,
            City = dto.City,
            State = dto.State,
            PostalCode = dto.PostalCode,
            Country = dto.Country
        };

        // First address is default automatically
        var hasAny = await db.Set<Address>().AnyAsync(a => a.UserId == UserId);
        if (!hasAny) address.IsDefault = true;

        db.Set<Address>().Add(address);
        await db.SaveChangesAsync();
        return Ok(address);
    }

    [HttpPatch("{id:int}/default")]
    public async Task<IActionResult> SetDefault(int id)
    {
        // Remove existing default
        var existing = await db.Set<Address>()
            .Where(a => a.UserId == UserId && a.IsDefault)
            .ToListAsync();
        existing.ForEach(a => a.IsDefault = false);

        // Set new default
        var address = await db.Set<Address>()
            .FirstOrDefaultAsync(a => a.Id == id && a.UserId == UserId);
        if (address is null) return NotFound();

        address.IsDefault = true;
        await db.SaveChangesAsync();
        return Ok(address);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var address = await db.Set<Address>()
            .FirstOrDefaultAsync(a => a.Id == id && a.UserId == UserId);
        if (address is null) return NotFound();

        db.Set<Address>().Remove(address);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
