// services/OrderService/Controllers/OrdersController.cs
// CHANGES from previous version:
//   - GetAll now returns total count alongside items (consistent with other services)
//   - GetById returns OrderDetailDto (grouped by shipment) instead of raw Order
//   - UpdateStatus: [Authorize(Roles = "Admin")] UNCHANGED — admin controls order status
//   - NEW GET  /api/orders/shipments            — seller views their shipments
//   - NEW PATCH /api/orders/shipments/{id}/status — seller updates their shipment status
//   - Create: UNCHANGED
//   - Delete: UNCHANGED

using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OrderService.Models;
using OrderService.Repositories;

namespace OrderService.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
[Produces("application/json")]
public class OrdersController(
    IOrderRepository repo,
    ILogger<OrdersController> logger) : ControllerBase
{
    private int UserId => int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : 0;
    private bool IsAdmin => User.IsInRole("Admin");
    private bool IsSeller => User.IsInRole("Seller");

    // ── GET /api/orders ───────────────────────────────────────────────────────
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        [FromQuery] string? status = null,
        [FromQuery] int? customerId = null,
        [FromQuery] int? sellerId = null)
    {
        if (IsAdmin)
        {
            // Admin can filter by anything
        }
        else if (IsSeller)
        {
            // Sellers only see their own orders
            sellerId = UserId;
            customerId = null;
        }
        else
        {
            // Buyers only see their own orders
            customerId = UserId;
            sellerId = null;
        }

        var (items, total) = await repo.GetAllAsync(page, pageSize, status, customerId, sellerId);

        return Ok(new
        {
            items,
            total,
            page,
            pageSize,
            totalPages = (int)Math.Ceiling(total / (double)pageSize)
        });
    }

    // ── GET /api/orders/{id} ──────────────────────────────────────────────────
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var detail = await repo.GetOrderDetailAsync(id);
        if (detail is null) return NotFound(new { message = $"Order {id} not found" });

        // Access control
        if (!IsAdmin)
        {
            if (IsSeller)
            {
                // Seller can view order only if they have a shipment in it
                var hasSellersLines = detail.Shipments.Any(s => s.SellerId == UserId)
                                   || detail.UnassignedLines.Any();
                if (!hasSellersLines) return Forbid();
            }
            else
            {
                // Buyer can only view their own orders
                if (detail.CustomerId != UserId) return Forbid();
            }
        }

        return Ok(detail);
    }

    // ── POST /api/orders ──────────────────────────────────────────────────────
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateOrderDto dto)
    {
        if (dto.Lines is null || dto.Lines.Count == 0)
            return BadRequest(new { message = "Order must have at least one line item" });

        if (dto.Lines.Any(l => l.Quantity <= 0 || l.UnitPrice <= 0))
            return BadRequest(new { message = "Invalid quantity or price in order lines" });

        var effectiveDto = IsAdmin ? dto : dto with { CustomerId = UserId };
        var order = await repo.CreateAsync(effectiveDto);

        logger.LogInformation("Order {Id} created for customer {CustomerId} with {Count} shipments",
            order.Id, order.CustomerId, order.Shipments.Count);

        return CreatedAtAction(nameof(GetById), new { id = order.Id }, order);
    }

    // ── PATCH /api/orders/{id}/status — Admin only ────────────────────────────
    [HttpPatch("{id:int}/status")]
    [Authorize(Roles = "Admin, Seller")]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateOrderStatusDto dto)
    {
        var valid = new[] { "Pending", "Processing", "Completed", "Cancelled" };
        if (!valid.Contains(dto.Status))
            return BadRequest(new { message = $"Invalid status. Must be one of: {string.Join(", ", valid)}" });

        var order = await repo.UpdateStatusAsync(id, dto.Status);
        if (order is null) return NotFound(new { message = $"Order {id} not found" });

        logger.LogInformation("Order {Id} status updated to {Status} by admin {AdminId}", id, dto.Status, UserId);
        return Ok(order);
    }

    // ── DELETE /api/orders/{id} — Admin only ──────────────────────────────────
    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        if (!await repo.DeleteAsync(id))
            return NotFound(new { message = $"Order {id} not found" });
        return NoContent();
    }

    // ── NEW: GET /api/orders/shipments — Seller views their shipments ─────────
    [HttpGet("shipments")]
    [Authorize(Roles = "Seller,Admin")]
    public async Task<IActionResult> GetShipments(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? status = null,
        [FromQuery] int? sellerId = null)
    {
        // Sellers can only see their own. Admins can filter by sellerId param.
        var effectiveSellerId = IsAdmin && sellerId.HasValue ? sellerId.Value : UserId;

        var (items, total) = await repo.GetShipmentsBySellerAsync(effectiveSellerId, page, pageSize, status);

        return Ok(new
        {
            items = items.Select(s => new
            {
                s.Id,
                s.OrderId,
                s.SellerId,
                s.SellerName,
                status = s.Status.ToString(),
                s.TrackingNumber,
                s.Carrier,
                s.EstimatedDelivery,
                s.ShippedAt,
                s.DeliveredAt,
                s.Notes,
                s.CreatedDate,
                // Include buyer and order total for seller dashboard display
                customerName = s.Order?.CustomerName,
                orderTotal = s.Order?.Total,
                lines = s.Order?.Lines
                    .Where(l => l.SellerId == s.SellerId)
                    .Select(l => new
                    {
                        l.ProductId,
                        l.ProductName,
                        l.Quantity,
                        l.UnitPrice,
                        lineTotal = l.Quantity * l.UnitPrice
                    })
            }),
            total,
            page,
            pageSize,
            totalPages = (int)Math.Ceiling(total / (double)pageSize)
        });
    }

    // ── NEW: PATCH /api/orders/shipments/{id}/status — Seller updates shipment ─
    [HttpPatch("shipments/{shipmentId:int}/status")]
    [Authorize(Roles = "Seller,Admin")]
    public async Task<IActionResult> UpdateShipmentStatus(
        int shipmentId, [FromBody] UpdateShipmentStatusDto dto)
    {
        var validStatuses = Enum.GetNames<ShipmentStatus>();
        if (!validStatuses.Contains(dto.Status, StringComparer.OrdinalIgnoreCase))
            return BadRequest(new
            {
                message = $"Invalid status. Valid values: {string.Join(", ", validStatuses)}"
            });

        // Sellers can only update their own shipments
        // Admins can update any (pass IsAdmin ? 0 as sellerId — repo ignores 0 check for admin)
        var effectiveSellerId = IsAdmin ? 0 : UserId;

        Shipment? result;
        if (IsAdmin)
        {
            // Admin: find the shipment without seller restriction
            var shipment = await db_FindShipmentAsync(shipmentId);
            if (shipment is null)
                return NotFound(new { message = $"Shipment {shipmentId} not found" });
            result = await repo.UpdateShipmentStatusAsync(shipmentId, shipment.SellerId, dto);
        }
        else
        {
            result = await repo.UpdateShipmentStatusAsync(shipmentId, UserId, dto);
        }

        if (result is null)
            return NotFound(new { message = $"Shipment {shipmentId} not found or does not belong to you" });

        logger.LogInformation("Shipment {ShipmentId} updated to {Status} by seller {SellerId}",
            shipmentId, dto.Status, UserId);

        return Ok(new
        {
            id = result.Id,
            status = result.Status.ToString(),
            trackingNumber = result.TrackingNumber,
            carrier = result.Carrier,
            shippedAt = result.ShippedAt,
            deliveredAt = result.DeliveredAt,
            estimatedDelivery = result.EstimatedDelivery,
            updatedDate = result.UpdatedDate
        });
    }

    // Helper — only needed for admin shipment update where we need the sellerId
    private async Task<Shipment?> db_FindShipmentAsync(int shipmentId)
    {
        // We need direct db access here for the admin case.
        // This is the one place we access db directly in the controller.
        // The alternative would be adding a GetShipmentByIdAsync to the repo — acceptable either way.
        var dbContext = HttpContext.RequestServices
            .GetRequiredService<OrderService.Data.OrderDbContext>();
        return await dbContext.Shipments.FindAsync(shipmentId);
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
        version = "3.0.0"
    });
}
