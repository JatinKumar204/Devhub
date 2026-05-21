// Repositories/ProductRepository.cs
using Microsoft.EntityFrameworkCore;
using ProductService.Data;
using ProductService.Models;

namespace ProductService.Repositories;

public interface IProductRepository
{
    Task<(IEnumerable<Product> Items, int Total)> GetAllAsync(
        int page, int pageSize, string? search, string? category,
        bool? isActive, bool? isFeatured, decimal? minPrice, decimal? maxPrice,
        string? sortBy, string? brand, int? sellerId = null);
    Task<Product?> GetByIdAsync(int id);
    Task<Product?> GetBySkuAsync(string sku);
    Task<Product> CreateAsync(CreateProductDto dto);
    Task<Product?> UpdateAsync(int id, UpdateProductDto dto, string updatedBy);
    Task<bool> DeleteAsync(int id);
    Task<IEnumerable<string>> GetCategoriesAsync();
    Task<IEnumerable<Product>> GetFeaturedAsync(int count = 8);
    Task<IEnumerable<Product>> GetRelatedAsync(int productId, int count = 6);
    Task UpdateStockAsync(int id, int delta);
    Task<ProductImage> AddImageAsync(int productId, string url, string? altText, bool isMain);
    Task DeleteImageAsync(int imageId);
}

public class ProductRepository(ProductDbContext db) : IProductRepository
{
    public async Task<(IEnumerable<Product> Items, int Total)> GetAllAsync(
        int page, int pageSize, string? search, string? category,
        bool? isActive, bool? isFeatured, decimal? minPrice, decimal? maxPrice,
        string? sortBy, string? brand, int? sellerId = null)
    {
        var query = db.Products.Include(p => p.Images).AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(p =>
                p.Name.Contains(search) ||
                p.Sku.Contains(search) ||
                p.Category.Contains(search) ||
                (p.Brand != null && p.Brand.Contains(search)));

        if (!string.IsNullOrWhiteSpace(category))
            query = query.Where(p => p.Category == category);

        if (!string.IsNullOrWhiteSpace(brand))
            query = query.Where(p => p.Brand == brand);

        if (isActive.HasValue)
            query = query.Where(p => p.IsActive == isActive.Value);

        if (isFeatured.HasValue)
            query = query.Where(p => p.IsFeatured == isFeatured.Value);

        if (minPrice.HasValue)
            query = query.Where(p => p.Price >= minPrice.Value);

        if (maxPrice.HasValue)
            query = query.Where(p => p.Price <= maxPrice.Value);

        if (sellerId.HasValue)
            query = query.Where(p => p.SellerId == sellerId.Value);

        var total = await query.CountAsync();

        query = sortBy?.ToLower() switch
        {
            "price_asc" => query.OrderBy(p => p.Price),
            "price_desc" => query.OrderByDescending(p => p.Price),
            "rating" => query.OrderByDescending(p => p.Rating),
            "newest" => query.OrderByDescending(p => p.CreatedDate),
            _ => query.OrderBy(p => p.Category).ThenBy(p => p.Name)
        };

        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return (items, total);
    }

    public async Task<Product?> GetByIdAsync(int id) =>
        await db.Products.Include(p => p.Images).FirstOrDefaultAsync(p => p.Id == id);

    public async Task<Product?> GetBySkuAsync(string sku) =>
        await db.Products.FirstOrDefaultAsync(p => p.Sku.ToLower() == sku.ToLower());

    public async Task<Product> CreateAsync(CreateProductDto dto)
    {
        var product = new Product
        {
            Name = dto.Name,
            Description = dto.Description,
            Category = dto.Category,
            CategoryId = dto.CategoryId,
            Sku = dto.Sku,
            Brand = dto.Brand,
            Price = dto.Price,
            OriginalPrice = dto.OriginalPrice,
            Stock = dto.Stock,
            IsFeatured = dto.IsFeatured,
            ImageUrl = dto.ImageUrl,
            Tags = dto.Tags,
            SellerId = dto.SellerId
        };

        if (dto.OriginalPrice.HasValue && dto.OriginalPrice > dto.Price)
            product.DiscountPercent = (int)Math.Round(
                (dto.OriginalPrice.Value - dto.Price) / dto.OriginalPrice.Value * 100);

        db.Products.Add(product);
        await db.SaveChangesAsync();
        return product;
    }

    public async Task<Product?> UpdateAsync(int id, UpdateProductDto dto, string updatedBy)
    {
        var product = await GetByIdAsync(id);
        if (product is null) return null;

        if (dto.Name is not null) product.Name = dto.Name;
        if (dto.Description is not null) product.Description = dto.Description;
        if (dto.Category is not null) product.Category = dto.Category;
        if (dto.CategoryId.HasValue) product.CategoryId = dto.CategoryId;
        if (dto.Price.HasValue) product.Price = dto.Price.Value;
        if (dto.Stock.HasValue) product.Stock = dto.Stock.Value;
        if (dto.IsActive.HasValue) product.IsActive = dto.IsActive.Value;
        if (dto.Brand is not null) product.Brand = dto.Brand;
        if (dto.OriginalPrice.HasValue) product.OriginalPrice = dto.OriginalPrice;
        if (dto.IsFeatured.HasValue) product.IsFeatured = dto.IsFeatured.Value;
        if (dto.ImageUrl is not null) product.ImageUrl = dto.ImageUrl;
        if (dto.Tags is not null) product.Tags = dto.Tags;

        if (product.OriginalPrice.HasValue && product.OriginalPrice > product.Price)
            product.DiscountPercent = (int)Math.Round(
                (product.OriginalPrice.Value - product.Price) / product.OriginalPrice.Value * 100);
        else
            product.DiscountPercent = 0;

        product.UpdatedDate = DateTime.UtcNow;
        product.UpdatedBy = updatedBy;
        await db.SaveChangesAsync();
        return product;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var product = await db.Products.FindAsync(id);
        if (product is null) return false;
        db.Products.Remove(product);
        await db.SaveChangesAsync();
        return true;
    }

    public async Task<IEnumerable<string>> GetCategoriesAsync() =>
        await db.Products.Select(p => p.Category).Distinct().OrderBy(c => c).ToListAsync();

    public async Task<IEnumerable<Product>> GetFeaturedAsync(int count = 8) =>
        await db.Products
            .Include(p => p.Images)
            .Where(p => p.IsFeatured && p.IsActive && p.Stock > 0)
            .OrderByDescending(p => p.Rating)
            .Take(count)
            .ToListAsync();

    public async Task<IEnumerable<Product>> GetRelatedAsync(int productId, int count = 6)
    {
        var product = await db.Products.FindAsync(productId);
        if (product is null) return [];

        return await db.Products
            .Include(p => p.Images)
            .Where(p => p.Category == product.Category && p.Id != productId && p.IsActive)
            .OrderByDescending(p => p.Rating)
            .Take(count)
            .ToListAsync();
    }

    public async Task UpdateStockAsync(int id, int delta)
    {
        var product = await db.Products.FindAsync(id);
        if (product is null) return;
        product.Stock = Math.Max(0, product.Stock + delta);
        product.UpdatedDate = DateTime.UtcNow;
        await db.SaveChangesAsync();
    }

    // NEW: persists an uploaded image record and optionally marks it as the main image
    public async Task<ProductImage> AddImageAsync(int productId, string url, string? altText, bool isMain)
    {
        // If this is the first / main image, clear the IsMain flag on existing ones
        if (isMain)
        {
            var existing = await db.ProductImages.Where(i => i.ProductId == productId).ToListAsync();
            foreach (var img in existing) img.IsMain = false;

            // Also set the shortcut ImageUrl on the product itself
            var product = await db.Products.FindAsync(productId);
            if (product is not null) product.ImageUrl = url;
        }

        var sortOrder = await db.ProductImages
            .Where(i => i.ProductId == productId)
            .CountAsync();

        var image = new ProductImage
        {
            ProductId = productId,
            Url = url,
            AltText = altText,
            SortOrder = sortOrder,
            IsMain = isMain
        };

        db.ProductImages.Add(image);
        await db.SaveChangesAsync();
        return image;
    }

    public async Task DeleteImageAsync(int imageId)
    {
        var image = await db.ProductImages.FindAsync(imageId);
        if (image is null) return;
        db.ProductImages.Remove(image);
        await db.SaveChangesAsync();
    }
}