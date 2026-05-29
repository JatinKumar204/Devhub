// services/OrderService/Models/Order.cs
// CHANGES from previous version:
//   - OrderLine gets SellerId + SellerName (the critical missing field from audit)
//   - New Shipment entity — per-seller shipment tracking inside one buyer order
//   - New ShipmentStatus enum — finer-grained than OrderStatus
//   - Order gets Shipments navigation property
//   - All existing fields on Order and OrderLine are UNCHANGED
//   - CreateOrderLineDto updated to accept SellerId + SellerName
//   - New UpdateShipmentStatusDto for seller shipment updates

using System.Text.Json.Serialization;

namespace OrderService.Models;

public abstract class AuditableEntity
{
    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedDate { get; set; }
}

// ── Order (unchanged fields) ──────────────────────────────────────────────────
public class Order : AuditableEntity
{
    public int Id { get; set; }
    public int CustomerId { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public OrderStatus Status { get; set; } = OrderStatus.Pending;
    public decimal Total { get; set; }
    public decimal ShippingFee { get; set; }
    public decimal Discount { get; set; }
    public string PaymentMethod { get; set; } = "COD";
    public string PaymentStatus { get; set; } = "Pending";
    public int? ShippingAddressId { get; set; }
    public string? TrackingNumber { get; set; }
    public DateTime? EstimatedDelivery { get; set; }
    public DateTime? DeliveredAt { get; set; }
    public string? Notes { get; set; }

    public List<OrderLine> Lines { get; set; } = [];
    // NEW: per-seller shipments within this order
    public List<Shipment> Shipments { get; set; } = [];

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public int ItemCount => Lines.Sum(l => l.Quantity);
}

// ── OrderLine — ADDS SellerId + SellerName ────────────────────────────────────
public class OrderLine
{
    public int Id { get; set; }
    public int OrderId { get; set; }
    [JsonIgnore]
    public Order Order { get; set; } = null!;

    public int ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal LineTotal => Quantity * UnitPrice;

    // NEW: which seller this line belongs to
    // Nullable so existing rows (before migration) still load without errors
    public int? SellerId { get; set; }
    public string SellerName { get; set; } = string.Empty;
}

// ── Shipment — NEW aggregate ──────────────────────────────────────────────────
/// <summary>
/// One Shipment per Seller per Order.
/// When a buyer places an order with items from 3 sellers, 3 Shipment rows are created.
/// Each seller manages their own shipment independently.
/// The parent Order.Status reflects the overall state (all shipments delivered = Completed).
/// </summary>
public class Shipment : AuditableEntity
{
    public int Id { get; set; }
    public int OrderId { get; set; }
    [JsonIgnore]
    public Order Order { get; set; } = null!;

    public int SellerId { get; set; }
    public string SellerName { get; set; } = string.Empty;

    public ShipmentStatus Status { get; set; } = ShipmentStatus.Preparing;
    public string? TrackingNumber { get; set; }
    public string? Carrier { get; set; }  // TCS, Leopards, BlueEx etc.
    public DateTime? EstimatedDelivery { get; set; }
    public DateTime? ShippedAt { get; set; }
    public DateTime? DeliveredAt { get; set; }
    public string? Notes { get; set; }

    // Lines belonging to this seller within the order (for display)
    [JsonIgnore]
    public List<OrderLine> Lines => Order?.Lines.Where(l => l.SellerId == SellerId).ToList() ?? [];
}

// ── Enums ─────────────────────────────────────────────────────────────────────
public enum OrderStatus
{
    Pending,
    Processing,
    Completed,
    Cancelled
}

public enum ShipmentStatus
{
    Preparing,      // seller received order, packing
    ReadyToShip,    // packed, waiting for pickup
    Shipped,        // handed to courier
    OutForDelivery, // courier on the way
    Delivered,      // buyer received
    Failed,         // delivery attempt failed
    Returned        // returned to seller
}

// ── DTOs ──────────────────────────────────────────────────────────────────────

public record CreateOrderDto(
    int CustomerId,
    string CustomerName,
    List<CreateOrderLineDto> Lines,
    string PaymentMethod = "COD",
    decimal ShippingFee = 0,
    decimal Discount = 0,
    int? ShippingAddressId = null,
    string? Notes = null
);

public record CreateOrderLineDto(
    int ProductId,
    string ProductName,
    int Quantity,
    decimal UnitPrice,
    // NEW optional fields — Angular checkout sends these when available
    int? SellerId = null,
    string? SellerName = null
);

public record UpdateOrderStatusDto(string Status);

// NEW: seller updates their own shipment
public record UpdateShipmentStatusDto(
    string Status,
    string? TrackingNumber = null,
    string? Carrier = null,
    string? Notes = null,
    DateTime? EstimatedDelivery = null
);

// NEW: response DTO that groups order lines by seller shipment
public class OrderDetailDto
{
    public int Id { get; set; }
    public int CustomerId { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public decimal Total { get; set; }
    public decimal ShippingFee { get; set; }
    public decimal Discount { get; set; }
    public string PaymentMethod { get; set; } = string.Empty;
    public string PaymentStatus { get; set; } = string.Empty;
    public string? TrackingNumber { get; set; }
    public DateTime? EstimatedDelivery { get; set; }
    public DateTime? DeliveredAt { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedDate { get; set; }
    public int ItemCount { get; set; }

    // Lines are presented grouped by seller shipment
    public List<ShipmentGroupDto> Shipments { get; set; } = [];
    // Lines with no seller assigned (legacy / admin-created orders)
    public List<OrderLineDto> UnassignedLines { get; set; } = [];
}

public class ShipmentGroupDto
{
    public int ShipmentId { get; set; }
    public int SellerId { get; set; }
    public string SellerName { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? TrackingNumber { get; set; }
    public string? Carrier { get; set; }
    public DateTime? EstimatedDelivery { get; set; }
    public DateTime? ShippedAt { get; set; }
    public DateTime? DeliveredAt { get; set; }
    public string? Notes { get; set; }
    public List<OrderLineDto> Lines { get; set; } = [];
}

public class OrderLineDto
{
    public int Id { get; set; }
    public int ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal LineTotal { get; set; }
    public int? SellerId { get; set; }
    public string SellerName { get; set; } = string.Empty;
}
