// services/OrderService/Repositories/OrderRepository.cs
// CHANGES from previous version:
//   - GetAllAsync for sellers now uses pure EF (SellerId on OrderLine) — no more raw SQL
//   - Added CreateShipmentsForOrderAsync — auto-creates one Shipment per seller when order is placed
//   - Added GetShipmentsBySellerAsync — seller dashboard shipment list
//   - Added UpdateShipmentStatusAsync — seller updates their own shipment
//   - Added GetOrderDetailAsync — returns OrderDetailDto with seller-grouped shipments
//   - GetAllAsync, GetByIdAsync, CreateAsync, UpdateStatusAsync, DeleteAsync signatures UNCHANGED

using Microsoft.EntityFrameworkCore;
using OrderService.Data;
using OrderService.Models;

namespace OrderService.Repositories;

public interface IOrderRepository
{
    // Existing interface — UNCHANGED signatures
    Task<(IEnumerable<Order> Items, int Total)> GetAllAsync(int page, int pageSize, string? status, int? customerId, int? sellerId);
    Task<Order?> GetByIdAsync(int id);
    Task<Order> CreateAsync(CreateOrderDto dto);
    Task<Order?> UpdateStatusAsync(int id, string status);
    Task<bool> DeleteAsync(int id);

    // NEW
    Task<OrderDetailDto?> GetOrderDetailAsync(int id);
    Task<(IEnumerable<Shipment> Items, int Total)> GetShipmentsBySellerAsync(int sellerId, int page, int pageSize, string? status);
    Task<Shipment?> UpdateShipmentStatusAsync(int shipmentId, int sellerId, UpdateShipmentStatusDto dto);
    Task CreateShipmentsForOrderAsync(int orderId);
}

public class OrderRepository(OrderDbContext db) : IOrderRepository
{
    // ── GetAllAsync — REPLACED raw SQL seller filter with clean EF ────────────
    public async Task<(IEnumerable<Order> Items, int Total)> GetAllAsync(
        int page, int pageSize, string? status, int? customerId, int? sellerId)
    {
        IQueryable<Order> query = db.Orders
            .Include(o => o.Lines)
            .Include(o => o.Shipments)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status) &&
            Enum.TryParse<OrderStatus>(status, true, out var s))
            query = query.Where(o => o.Status == s);

        if (customerId.HasValue)
            query = query.Where(o => o.CustomerId == customerId.Value);

        if (sellerId.HasValue)
            query = query.Where(o => o.Lines.Any(l => l.SellerId == sellerId.Value));

        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(o => o.CreatedDate)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return (items, total);
    }

    public async Task<Order?> GetByIdAsync(int id) =>
        await db.Orders
            .Include(o => o.Lines)
            .Include(o => o.Shipments)
            .FirstOrDefaultAsync(o => o.Id == id);

    // ── GetOrderDetailAsync — new: returns grouped DTO ────────────────────────
    public async Task<OrderDetailDto?> GetOrderDetailAsync(int id)
    {
        var order = await db.Orders
            .Include(o => o.Lines)
            .Include(o => o.Shipments)
            .FirstOrDefaultAsync(o => o.Id == id);

        if (order is null) return null;

        // Group lines by shipment
        var shipmentGroups = order.Shipments.Select(sh => new ShipmentGroupDto
        {
            ShipmentId = sh.Id,
            SellerId = sh.SellerId,
            SellerName = sh.SellerName,
            Status = sh.Status.ToString(),
            TrackingNumber = sh.TrackingNumber,
            Carrier = sh.Carrier,
            EstimatedDelivery = sh.EstimatedDelivery,
            ShippedAt = sh.ShippedAt,
            DeliveredAt = sh.DeliveredAt,
            Notes = sh.Notes,
            Lines = order.Lines
                .Where(l => l.SellerId == sh.SellerId)
                .Select(MapLine)
                .ToList()
        }).ToList();

        // Lines with no seller (legacy orders or admin-created)
        var assignedProductIds = order.Shipments
            .SelectMany(sh => order.Lines.Where(l => l.SellerId == sh.SellerId))
            .Select(l => l.Id)
            .ToHashSet();

        var unassigned = order.Lines
            .Where(l => !assignedProductIds.Contains(l.Id))
            .Select(MapLine)
            .ToList();

        return new OrderDetailDto
        {
            Id = order.Id,
            CustomerId = order.CustomerId,
            CustomerName = order.CustomerName,
            Status = order.Status.ToString(),
            Total = order.Total,
            ShippingFee = order.ShippingFee,
            Discount = order.Discount,
            PaymentMethod = order.PaymentMethod,
            PaymentStatus = order.PaymentStatus,
            TrackingNumber = order.TrackingNumber,
            EstimatedDelivery = order.EstimatedDelivery,
            DeliveredAt = order.DeliveredAt,
            Notes = order.Notes,
            CreatedDate = order.CreatedDate,
            ItemCount = order.Lines.Sum(l => l.Quantity),
            Shipments = shipmentGroups,
            UnassignedLines = unassigned
        };
    }

    // ── CreateAsync — creates order + auto-creates shipments ──────────────────
    public async Task<Order> CreateAsync(CreateOrderDto dto)
    {
        var order = new Order
        {
            CustomerId = dto.CustomerId,
            CustomerName = dto.CustomerName,
            PaymentMethod = dto.PaymentMethod,
            ShippingFee = dto.ShippingFee,
            Discount = dto.Discount,
            ShippingAddressId = dto.ShippingAddressId,
            Notes = dto.Notes,
            EstimatedDelivery = DateTime.UtcNow.AddDays(5),
            Lines = dto.Lines.Select(l => new OrderLine
            {
                ProductId = l.ProductId,
                ProductName = l.ProductName,
                Quantity = l.Quantity,
                UnitPrice = l.UnitPrice,
                SellerId = l.SellerId,
                SellerName = l.SellerName ?? string.Empty
            }).ToList()
        };

        order.Total = order.Lines.Sum(l => l.Quantity * l.UnitPrice)
                      + dto.ShippingFee
                      - dto.Discount;

        db.Orders.Add(order);
        await db.SaveChangesAsync();

        // Auto-create one Shipment per distinct seller in the order
        await CreateShipmentsForOrderAsync(order.Id);

        return order;
    }

    public async Task CreateShipmentsForOrderAsync(int orderId)
    {
        var order = await db.Orders
            .Include(o => o.Lines)
            .Include(o => o.Shipments)
            .FirstOrDefaultAsync(o => o.Id == orderId);

        if (order is null) return;

        // Find sellers that don't already have a shipment record
        var existingSellerIds = order.Shipments.Select(s => s.SellerId).ToHashSet();

        var newShipments = order.Lines
            .Where(l => l.SellerId.HasValue && !existingSellerIds.Contains(l.SellerId!.Value))
            .GroupBy(l => new { l.SellerId, l.SellerName })
            .Select(g => new Shipment
            {
                OrderId = orderId,
                SellerId = g.Key.SellerId!.Value,
                SellerName = g.Key.SellerName,
                Status = ShipmentStatus.Preparing,
                CreatedDate = DateTime.UtcNow
            })
            .ToList();

        if (newShipments.Count > 0)
        {
            db.Shipments.AddRange(newShipments);
            await db.SaveChangesAsync();
        }
    }

    // ── Seller shipment queries ───────────────────────────────────────────────

    public async Task<(IEnumerable<Shipment> Items, int Total)> GetShipmentsBySellerAsync(
        int sellerId, int page, int pageSize, string? status)
    {
        var query = db.Shipments
            .Include(s => s.Order)
            .ThenInclude(o => o.Lines)
            .Where(s => s.SellerId == sellerId)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status) &&
            Enum.TryParse<ShipmentStatus>(status, true, out var parsed))
            query = query.Where(s => s.Status == parsed);

        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(s => s.CreatedDate)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return (items, total);
    }

    public async Task<Shipment?> UpdateShipmentStatusAsync(
        int shipmentId, int sellerId, UpdateShipmentStatusDto dto)
    {
        if (!Enum.TryParse<ShipmentStatus>(dto.Status, true, out var newStatus))
            return null;

        var shipment = await db.Shipments
            .FirstOrDefaultAsync(s => s.Id == shipmentId && s.SellerId == sellerId);

        if (shipment is null) return null;

        shipment.Status = newStatus;
        shipment.UpdatedDate = DateTime.UtcNow;

        if (dto.TrackingNumber is not null) shipment.TrackingNumber = dto.TrackingNumber;
        if (dto.Carrier is not null) shipment.Carrier = dto.Carrier;
        if (dto.Notes is not null) shipment.Notes = dto.Notes;
        if (dto.EstimatedDelivery.HasValue) shipment.EstimatedDelivery = dto.EstimatedDelivery;

        if (newStatus == ShipmentStatus.Shipped)
            shipment.ShippedAt = DateTime.UtcNow;

        if (newStatus == ShipmentStatus.Delivered)
        {
            shipment.DeliveredAt = DateTime.UtcNow;
            // Check if ALL shipments for this order are delivered → complete the order
            await _tryCompleteOrderAsync(shipment.OrderId);
        }

        await db.SaveChangesAsync();
        return shipment;
    }

    // ── UpdateStatusAsync (unchanged — admin only) ────────────────────────────
    public async Task<Order?> UpdateStatusAsync(int id, string status)
    {
        var order = await db.Orders.Include(o => o.Lines).FirstOrDefaultAsync(o => o.Id == id);
        if (order is null) return null;

        if (!Enum.TryParse<OrderStatus>(status, true, out var parsed)) return null;

        order.Status = parsed;
        order.UpdatedDate = DateTime.UtcNow;

        if (parsed == OrderStatus.Completed)
            order.DeliveredAt = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return order;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var order = await db.Orders.FindAsync(id);
        if (order is null) return false;
        db.Orders.Remove(order);
        await db.SaveChangesAsync();
        return true;
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private async Task _tryCompleteOrderAsync(int orderId)
    {
        var allDelivered = await db.Shipments
            .Where(s => s.OrderId == orderId)
            .AllAsync(s => s.Status == ShipmentStatus.Delivered);

        if (allDelivered)
        {
            var order = await db.Orders.FindAsync(orderId);
            if (order is not null && order.Status != OrderStatus.Completed)
            {
                order.Status = OrderStatus.Completed;
                order.DeliveredAt = DateTime.UtcNow;
                order.UpdatedDate = DateTime.UtcNow;
            }
        }
    }

    private static OrderLineDto MapLine(OrderLine l) => new()
    {
        Id = l.Id,
        ProductId = l.ProductId,
        ProductName = l.ProductName,
        Quantity = l.Quantity,
        UnitPrice = l.UnitPrice,
        LineTotal = l.Quantity * l.UnitPrice,
        SellerId = l.SellerId,
        SellerName = l.SellerName
    };
}
