// Controllers/OrdersController.cs — REPLACE EXISTING FILE
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OrderService.Models;
using OrderService.Repositories;
using System.Security.Claims;

namespace OrderService.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
[Produces("application/json")]
public class OrdersController(IOrderRepository repo, ILogger<OrdersController> logger) : ControllerBase
{
    private int UserId => int.TryParse(
        User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : 0;

    private bool IsAdmin => User.IsInRole("Admin");

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        [FromQuery] string? status = null,
        [FromQuery] int? customerId = null,
        [FromQuery] int? sellerId = null)
    {
        // Non-admins can only see their own orders
        if (!IsAdmin && User.IsInRole("Buyer"))
            customerId = UserId;
        else
            sellerId = UserId;

            var orders = await repo.GetAllAsync(page, pageSize, status, customerId, sellerId);
        return Ok(orders);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var order = await repo.GetByIdAsync(id);
        if (order is null) return NotFound(new { message = $"Order {id} not found" });

        // Non-admins can only view their own orders
        if (!IsAdmin && order.CustomerId != UserId)
            return Forbid();

        return Ok(order);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateOrderDto dto)
    {
        if (dto.Lines is null || dto.Lines.Count == 0)
            return BadRequest(new { message = "Order must have at least one line item" });

        if (dto.Lines.Any(l => l.Quantity <= 0 || l.UnitPrice <= 0))
            return BadRequest(new { message = "Invalid quantity or price in order lines" });

        // Force customerId from JWT for non-admins
        var effectiveDto = IsAdmin ? dto : dto with { CustomerId = UserId };

        var order = await repo.CreateAsync(effectiveDto);
        logger.LogInformation("Order {Id} created for customer {CustomerId}", order.Id, order.CustomerId);

        return CreatedAtAction(nameof(GetById), new { id = order.Id }, order);
    }

    [HttpPatch("{id:int}/status")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateOrderStatusDto dto)
    {
        var validStatuses = new[] { "Pending", "Processing", "Completed", "Cancelled" };
        if (!validStatuses.Contains(dto.Status))
            return BadRequest(new { message = $"Invalid status. Must be one of: {string.Join(", ", validStatuses)}" });

        var order = await repo.UpdateStatusAsync(id, dto.Status);
        if (order is null) return NotFound(new { message = $"Order {id} not found" });

        logger.LogInformation("Order {Id} status updated to {Status}", id, dto.Status);
        return Ok(order);
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        if (!await repo.DeleteAsync(id))
            return NotFound(new { message = $"Order {id} not found" });
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
        service = "OrderService",
        status = "healthy",
        timestamp = DateTime.UtcNow,
        version = "2.0.0"
    });
}
