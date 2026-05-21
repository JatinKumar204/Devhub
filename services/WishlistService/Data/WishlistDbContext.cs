using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using WishlistService.Models;

namespace WishlistService.Data;

public class WishlistDbContext(DbContextOptions<WishlistDbContext> options) : DbContext(options)
{
    public DbSet<WishlistItem> WishlistItems => Set<WishlistItem>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<WishlistItem>(e =>
        {
            e.HasKey(x => x.Id);
            // A user can only wishlist a product once
            e.HasIndex(x => new { x.UserId, x.ProductId }).IsUnique();
            e.Property(x => x.ProductName).HasMaxLength(200).IsRequired();
            e.Property(x => x.ProductImage).HasMaxLength(500);
            e.Property(x => x.ProductPrice).HasColumnType("decimal(18,2)");
        });

        // Seed data — user 3 (Carol) has some wishlisted items
        b.Entity<WishlistItem>().HasData(
            new WishlistItem
            {
                Id = 1,
                UserId = 3,
                ProductId = 2,
                ProductName = "Apple MacBook Air M3",
                ProductImage = "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400",
                ProductPrice = 349999m,
                AddedDate = new DateTime(2024, 6, 5, 0, 0, 0, DateTimeKind.Utc)
            },
            new WishlistItem
            {
                Id = 2,
                UserId = 3,
                ProductId = 9,
                ProductName = "Canon EOS R50 Mirrorless Camera",
                ProductImage = "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400",
                ProductPrice = 129999m,
                AddedDate = new DateTime(2024, 6, 6, 0, 0, 0, DateTimeKind.Utc)
            },
            new WishlistItem
            {
                Id = 3,
                UserId = 4,
                ProductId = 11,
                ProductName = "Dyson V15 Detect Vacuum",
                ProductImage = "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400",
                ProductPrice = 89999m,
                AddedDate = new DateTime(2024, 6, 8, 0, 0, 0, DateTimeKind.Utc)
            }
        );
    }
}

public class WishlistDbContextFactory : IDesignTimeDbContextFactory<WishlistDbContext>
{
    public WishlistDbContext CreateDbContext(string[] args)
    {
        var config = new ConfigurationBuilder()
            .SetBasePath(Directory.GetCurrentDirectory())
            .AddJsonFile("appsettings.json", optional: false)
            .AddJsonFile("appsettings.Development.json", optional: true)
            .AddEnvironmentVariables()
            .Build();

        var connectionString = config.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException(
                "ConnectionStrings:DefaultConnection is not configured.");

        var optionsBuilder = new DbContextOptionsBuilder<WishlistDbContext>();
        optionsBuilder.UseSqlServer(connectionString);

        return new WishlistDbContext(optionsBuilder.Options);
    }
}