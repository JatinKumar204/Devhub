using System.Text.Json.Serialization;

namespace CartService.Models;

public class Cart
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public List<CartItem> Items { get; set; } = [];
    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedDate { get; set; }

    // Computed
    public decimal SubTotal => Items.Sum(i => i.LineTotal);
    public int TotalItems => Items.Sum(i => i.Quantity);
}

public class CartItem
{
    public int Id { get; set; }
    public int CartId { get; set; }
    [JsonIgnore]
    public Cart Cart { get; set; } = null!;
    public int ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string? ProductImage { get; set; }
    public int Quantity { get; set; } = 1;
    public decimal UnitPrice { get; set; }
    public DateTime AddedDate { get; set; } = DateTime.UtcNow;

    public decimal LineTotal => Quantity * UnitPrice;
}

public record AddToCartDto(int ProductId, string ProductName, string? ProductImage, int Quantity, decimal UnitPrice);
public record UpdateCartItemDto(int Quantity);
