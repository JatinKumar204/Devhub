// Data/ProductDbContext.cs
using Microsoft.EntityFrameworkCore;
using ProductService.Models;

namespace ProductService.Data;

public class ProductDbContext(DbContextOptions<ProductDbContext> options) : DbContext(options)
{
    public DbSet<Product> Products => Set<Product>();
    public DbSet<ProductImage> ProductImages => Set<ProductImage>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<Product>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Name).HasMaxLength(200).IsRequired();
            e.Property(x => x.Description).HasMaxLength(2000);
            e.Property(x => x.Category).HasMaxLength(100).IsRequired();
            e.Property(x => x.Sku).HasMaxLength(100).IsRequired();
            e.Property(x => x.Brand).HasMaxLength(100);
            e.Property(x => x.Tags).HasMaxLength(500);
            e.Property(x => x.CreatedBy).HasMaxLength(200);
            e.Property(x => x.UpdatedBy).HasMaxLength(200);
            e.HasIndex(x => x.Sku).IsUnique();
            e.Property(x => x.Price).HasColumnType("decimal(18,2)");
            e.Property(x => x.OriginalPrice).HasColumnType("decimal(18,2)");
            e.Property(x => x.Rating).HasColumnType("decimal(3,2)");
            e.HasMany(x => x.Images)
             .WithOne(x => x.Product)
             .HasForeignKey(x => x.ProductId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<ProductImage>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Url).HasMaxLength(500).IsRequired();
            e.Property(x => x.AltText).HasMaxLength(200);
        });

        // ── Seed Data ────────────────────────────────────────────────────────
        b.Entity<Product>().HasData(
            new Product
            {
                Id = 1,
                Name = "Samsung Galaxy S24",
                Sku = "EL-001",
                Description = "Latest Samsung flagship with AI-powered camera and all-day battery life.",
                Category = "Electronics",
                Brand = "Samsung",
                Price = 189999m,
                OriginalPrice = 209999m,
                DiscountPercent = 10,
                Stock = 45,
                IsActive = true,
                IsFeatured = true,
                ImageUrl = "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=400",
                Rating = 4.5m,
                ReviewCount = 128,
                Tags = "smartphone,android,samsung",
                SellerId = 1,
                CreatedDate = new DateTime(2024, 3, 1, 0, 0, 0, DateTimeKind.Utc),
                CreatedBy = "seed"
            },
            new Product
            {
                Id = 2,
                Name = "Apple MacBook Air M3",
                Sku = "EL-002",
                Description = "Ultra-thin laptop with Apple M3 chip. 18 hours battery life, fanless design.",
                Category = "Electronics",
                Brand = "Apple",
                Price = 349999m,
                OriginalPrice = 379999m,
                DiscountPercent = 8,
                Stock = 22,
                IsActive = true,
                IsFeatured = true,
                ImageUrl = "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400",
                Rating = 4.8m,
                ReviewCount = 256,
                Tags = "laptop,apple,macbook",
                SellerId = 1,
                CreatedDate = new DateTime(2024, 3, 5, 0, 0, 0, DateTimeKind.Utc),
                CreatedBy = "seed"
            },
            new Product
            {
                Id = 3,
                Name = "Sony WH-1000XM5 Headphones",
                Sku = "EL-003",
                Description = "Industry-leading noise cancellation with 30-hour battery and crystal-clear calls.",
                Category = "Electronics",
                Brand = "Sony",
                Price = 65999m,
                OriginalPrice = 79999m,
                DiscountPercent = 18,
                Stock = 60,
                IsActive = true,
                IsFeatured = true,
                ImageUrl = "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400",
                Rating = 4.7m,
                ReviewCount = 412,
                Tags = "headphones,sony,noise-cancelling",
                SellerId = 1,
                CreatedDate = new DateTime(2024, 3, 8, 0, 0, 0, DateTimeKind.Utc),
                CreatedBy = "seed"
            },
            new Product
            {
                Id = 4,
                Name = "Nike Air Max 270",
                Sku = "FA-001",
                Description = "Inspired by two iconic Air Max models, the 270 delivers unrivaled comfort.",
                Category = "Fashion",
                Brand = "Nike",
                Price = 24999m,
                OriginalPrice = 31999m,
                DiscountPercent = 22,
                Stock = 85,
                IsActive = true,
                IsFeatured = true,
                ImageUrl = "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400",
                Rating = 4.4m,
                ReviewCount = 189,
                Tags = "shoes,nike,running",
                SellerId = 1,
                CreatedDate = new DateTime(2024, 3, 10, 0, 0, 0, DateTimeKind.Utc),
                CreatedBy = "seed"
            },
            new Product
            {
                Id = 5,
                Name = "Levi's 501 Original Jeans",
                Sku = "FA-002",
                Description = "The original straight fit jean with button fly. The jeans that started it all.",
                Category = "Fashion",
                Brand = "Levis",
                Price = 8999m,
                OriginalPrice = 11999m,
                DiscountPercent = 25,
                Stock = 120,
                IsActive = true,
                IsFeatured = false,
                ImageUrl = "https://images.unsplash.com/photo-1542272604-787c3835535d?w=400",
                Rating = 4.3m,
                ReviewCount = 95,
                Tags = "jeans,levis,fashion",
                SellerId = 1,
                CreatedDate = new DateTime(2024, 3, 12, 0, 0, 0, DateTimeKind.Utc),
                CreatedBy = "seed"
            },
            new Product
            {
                Id = 6,
                Name = "Instant Pot Duo 7-in-1",
                Sku = "HK-001",
                Description = "Multi-use pressure cooker, slow cooker, rice cooker, steamer, sauté, and warmer.",
                Category = "Home & Kitchen",
                Brand = "Instant Pot",
                Price = 18999m,
                OriginalPrice = 23999m,
                DiscountPercent = 21,
                Stock = 35,
                IsActive = true,
                IsFeatured = true,
                ImageUrl = "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400",
                Rating = 4.6m,
                ReviewCount = 342,
                Tags = "kitchen,cooking,appliance",
                SellerId = 1,
                CreatedDate = new DateTime(2024, 3, 14, 0, 0, 0, DateTimeKind.Utc),
                CreatedBy = "seed"
            },
            new Product
            {
                Id = 7,
                Name = "Yoga Mat Premium Non-Slip",
                Sku = "SP-001",
                Description = "Extra thick 6mm exercise mat with superior grip. Ideal for yoga, pilates, and stretching.",
                Category = "Sports & Outdoors",
                Brand = "LifeFit",
                Price = 3499m,
                OriginalPrice = null,
                DiscountPercent = 0,
                Stock = 200,
                IsActive = true,
                IsFeatured = false,
                ImageUrl = "https://images.unsplash.com/photo-1601925228010-f9c19985bee7?w=400",
                Rating = 4.2m,
                ReviewCount = 67,
                Tags = "yoga,fitness,mat",
                SellerId = 1,
                CreatedDate = new DateTime(2024, 3, 16, 0, 0, 0, DateTimeKind.Utc),
                CreatedBy = "seed"
            },
            new Product
            {
                Id = 8,
                Name = "The Pragmatic Programmer",
                Sku = "BK-001",
                Description = "From journeyman to master — timeless wisdom for software developers.",
                Category = "Books",
                Brand = "Addison-Wesley",
                Price = 3999m,
                OriginalPrice = 4999m,
                DiscountPercent = 20,
                Stock = 75,
                IsActive = true,
                IsFeatured = false,
                ImageUrl = "https://images.unsplash.com/photo-1532012197267-da84d127e765?w=400",
                Rating = 4.9m,
                ReviewCount = 512,
                Tags = "programming,books,software",
                SellerId = 1,
                CreatedDate = new DateTime(2024, 3, 18, 0, 0, 0, DateTimeKind.Utc),
                CreatedBy = "seed"
            },
            new Product
            {
                Id = 9,
                Name = "Canon EOS R50 Mirrorless Camera",
                Sku = "EL-004",
                Description = "24.2MP APS-C mirrorless with dual pixel autofocus and 4K video.",
                Category = "Electronics",
                Brand = "Canon",
                Price = 129999m,
                OriginalPrice = 149999m,
                DiscountPercent = 13,
                Stock = 15,
                IsActive = true,
                IsFeatured = true,
                ImageUrl = "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400",
                Rating = 4.6m,
                ReviewCount = 78,
                Tags = "camera,canon,photography",
                SellerId = 1,
                CreatedDate = new DateTime(2024, 3, 20, 0, 0, 0, DateTimeKind.Utc),
                CreatedBy = "seed"
            },
            new Product
            {
                Id = 10,
                Name = "Logitech MX Master 3S Mouse",
                Sku = "EL-005",
                Description = "Advanced wireless mouse with MagSpeed scroll wheel and customizable buttons.",
                Category = "Electronics",
                Brand = "Logitech",
                Price = 14999m,
                OriginalPrice = 17999m,
                DiscountPercent = 17,
                Stock = 90,
                IsActive = true,
                IsFeatured = false,
                ImageUrl = "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400",
                Rating = 4.7m,
                ReviewCount = 223,
                Tags = "mouse,logitech,wireless",
                SellerId = 1,
                CreatedDate = new DateTime(2024, 3, 22, 0, 0, 0, DateTimeKind.Utc),
                CreatedBy = "seed"
            },
            new Product
            {
                Id = 11,
                Name = "Dyson V15 Detect Vacuum",
                Sku = "HK-002",
                Description = "Laser detects hidden dust. Piezo sensor counts and sizes particles in real time.",
                Category = "Home & Kitchen",
                Brand = "Dyson",
                Price = 89999m,
                OriginalPrice = 109999m,
                DiscountPercent = 18,
                Stock = 12,
                IsActive = true,
                IsFeatured = true,
                ImageUrl = "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400",
                Rating = 4.5m,
                ReviewCount = 134,
                Tags = "vacuum,dyson,cleaning",
                SellerId = 1,
                CreatedDate = new DateTime(2024, 3, 24, 0, 0, 0, DateTimeKind.Utc),
                CreatedBy = "seed"
            },
            new Product
            {
                Id = 12,
                Name = "Adidas Ultraboost 22",
                Sku = "FA-003",
                Description = "Energy-returning Boost midsole in a Primeknit+ upper. Run further, feel better.",
                Category = "Fashion",
                Brand = "Adidas",
                Price = 22999m,
                OriginalPrice = 27999m,
                DiscountPercent = 18,
                Stock = 55,
                IsActive = true,
                IsFeatured = false,
                ImageUrl = "https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=400",
                Rating = 4.4m,
                ReviewCount = 167,
                Tags = "shoes,adidas,running",
                SellerId = 1,
                CreatedDate = new DateTime(2024, 3, 26, 0, 0, 0, DateTimeKind.Utc),
                CreatedBy = "seed"
            }
        );
    }
}
