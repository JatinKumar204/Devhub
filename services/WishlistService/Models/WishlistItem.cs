namespace WishlistService.Models;

public class WishlistItem
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public int ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string? ProductImage { get; set; }
    public decimal ProductPrice { get; set; }
    public DateTime AddedDate { get; set; } = DateTime.UtcNow;
}

public record AddWishlistItemDto(
    int ProductId,
    string ProductName,
    string? ProductImage,
    decimal ProductPrice);