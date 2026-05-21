using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using CartService.Models;
using CartService.Repositories;
using System.Security.Claims;

namespace CartService.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
[Produces("application/json")]
public class CartController(ICartRepository repo, ILogger<CartController> logger) : ControllerBase
{
    private int UserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)
        ?? throw new UnauthorizedAccessException("User ID missing from token"));

    [HttpGet]
    public async Task<IActionResult> GetCart()
    {
        var cart = await repo.GetOrCreateAsync(UserId);
        return Ok(cart);
    }

    [HttpPost("items")]
    public async Task<IActionResult> AddItem([FromBody] AddToCartDto dto)
    {
        if (dto.Quantity <= 0)
            return BadRequest(new { message = "Quantity must be greater than 0" });

        var cart = await repo.AddItemAsync(UserId, dto);
        logger.LogInformation("User {UserId} added product {ProductId} to cart", UserId, dto.ProductId);
        return Ok(cart);
    }

    [HttpPut("items/{productId:int}")]
    public async Task<IActionResult> UpdateItem(int productId, [FromBody] UpdateCartItemDto dto)
    {
        var cart = await repo.UpdateItemAsync(UserId, productId, dto.Quantity);
        if (cart is null) return NotFound(new { message = "Cart not found" });
        return Ok(cart);
    }

    [HttpDelete("items/{productId:int}")]
    public async Task<IActionResult> RemoveItem(int productId)
    {
        var cart = await repo.RemoveItemAsync(UserId, productId);
        if (cart is null) return NotFound(new { message = "Cart not found" });
        return Ok(cart);
    }

    [HttpDelete]
    public async Task<IActionResult> ClearCart()
    {
        await repo.ClearCartAsync(UserId);
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
        service = "CartService",
        status = "healthy",
        timestamp = DateTime.UtcNow,
        version = "1.0.0"
    });
}
