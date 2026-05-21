// Models/Product.cs  — REPLACE EXISTING FILE
using System.Text.Json.Serialization;

namespace ProductService.Models;

public abstract class AuditableEntity
{
    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedDate { get; set; }
    public string CreatedBy { get; set; } = "system";
    public string? UpdatedBy { get; set; }
}

public class Product : AuditableEntity
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public int? CategoryId { get; set; }           // NEW: FK to categories table
    public string Sku { get; set; } = string.Empty;
    public string? Brand { get; set; }             // NEW
    public decimal Price { get; set; }
    public decimal? OriginalPrice { get; set; }    // NEW: for showing "was" price
    public int DiscountPercent { get; set; }       // NEW: computed / admin-set
    public int Stock { get; set; }
    public bool IsActive { get; set; } = true;
    public bool IsFeatured { get; set; }           // NEW: homepage feature flag
    public string? ImageUrl { get; set; }          // kept — main image
    public List<ProductImage> Images { get; set; } = []; // NEW: gallery
    public decimal Rating { get; set; }            // NEW: avg rating
    public int ReviewCount { get; set; }           // NEW
    public string? Tags { get; set; }              // NEW: comma-separated
    public int? SellerId { get; set; }             // NEW: multi-vendor
}

public class ProductImage
{
    public int Id { get; set; }
    public int ProductId { get; set; }
    [JsonIgnore]
    public Product Product { get; set; } = null!;
    public string Url { get; set; } = string.Empty;
    public string? AltText { get; set; }
    public int SortOrder { get; set; }
    public bool IsMain { get; set; }
}

// DTOs
public record CreateProductDto(
    string Name,
    string Description,
    string Category,
    string Sku,
    decimal Price,
    int Stock,
    string? Brand = null,
    decimal? OriginalPrice = null,
    int? CategoryId = null,
    bool IsFeatured = false,
    string? ImageUrl = null,
    string? Tags = null,
    int? SellerId = null);

public record UpdateProductDto(
    string? Name,
    string? Description,
    string? Category,
    decimal? Price,
    int? Stock,
    bool? IsActive,
    string? Brand = null,
    decimal? OriginalPrice = null,
    int? CategoryId = null,
    bool? IsFeatured = null,
    string? ImageUrl = null,
    string? Tags = null);

public record ProductSummaryDto(
    int Id,
    string Name,
    string Category,
    string? Brand,
    decimal Price,
    decimal? OriginalPrice,
    int DiscountPercent,
    int Stock,
    bool IsActive,
    bool IsFeatured,
    string? ImageUrl,
    decimal Rating,
    int ReviewCount,
    string Sku);
