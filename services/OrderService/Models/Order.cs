// Models/Order.cs — REPLACE EXISTING FILE
using System.Text.Json.Serialization;

namespace OrderService.Models;

public abstract class AuditableEntity
{
    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedDate { get; set; }
}

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

    public int ItemCount => Lines.Sum(l => l.Quantity);
}

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
}

public enum OrderStatus
{
    Pending,
    Processing,
    Completed,
    Cancelled
}

// DTOs
public record CreateOrderDto(
    int CustomerId,
    string CustomerName,
    List<CreateOrderLineDto> Lines,
    string PaymentMethod = "COD",
    decimal ShippingFee = 0,
    decimal Discount = 0,
    int? ShippingAddressId = null,
    string? Notes = null);

public record CreateOrderLineDto(
    int ProductId,
    string ProductName,
    int Quantity,
    decimal UnitPrice);

public record UpdateOrderStatusDto(string Status);
