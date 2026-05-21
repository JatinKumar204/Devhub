using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WishlistService.Models;
using WishlistService.Repositories;
using System.Security.Claims;

namespace WishlistService.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
[Produces("application/json")]
public class WishlistController(IWishlistRepository repo, ILogger<WishlistController> logger) : ControllerBase
{
    private int UserId => int.TryParse(
        User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id
        : throw new UnauthorizedAccessException("User ID missing from token");

    [HttpGet]
    public async Task<IActionResult> GetWishlist() =>
        Ok(await repo.GetByUserIdAsync(UserId));

    [HttpGet("check/{productId:int}")]
    public async Task<IActionResult> CheckWishlisted(int productId) =>
        Ok(new { isWishlisted = await repo.IsWishlistedAsync(UserId, productId) });

    [HttpPost]
    public async Task<IActionResult> AddToWishlist([FromBody] AddWishlistItemDto dto)
    {
        if (dto.ProductId <= 0)
            return BadRequest(new { message = "Invalid product ID" });

        var item = await repo.AddAsync(UserId, dto);
        logger.LogInformation("User {UserId} wishlisted product {ProductId}", UserId, dto.ProductId);
        return Ok(item);
    }

    [HttpDelete("{productId:int}")]
    public async Task<IActionResult> RemoveFromWishlist(int productId)
    {
        var removed = await repo.RemoveAsync(UserId, productId);
        if (!removed)
            return NotFound(new { message = "Item not found in wishlist" });

        logger.LogInformation("User {UserId} removed product {ProductId} from wishlist", UserId, productId);
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
        service = "WishlistService",
        status = "healthy",
        timestamp = DateTime.UtcNow,
        version = "1.0.0"
    });
}