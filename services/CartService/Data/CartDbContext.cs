using Microsoft.EntityFrameworkCore;
using CartService.Models;

namespace CartService.Data;

public class CartDbContext(DbContextOptions<CartDbContext> options) : DbContext(options)
{
    public DbSet<Cart> Carts => Set<Cart>();
    public DbSet<CartItem> CartItems => Set<CartItem>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<Cart>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.UserId).IsUnique();
            e.Ignore(x => x.SubTotal);
            e.Ignore(x => x.TotalItems);
        });

        b.Entity<CartItem>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => new { x.CartId, x.ProductId }).IsUnique();
            e.Property(x => x.UnitPrice).HasColumnType("decimal(18,2)");
            e.Property(x => x.ProductName).HasMaxLength(200);
            e.Ignore(x => x.LineTotal);
            e.HasOne(x => x.Cart)
             .WithMany(x => x.Items)
             .HasForeignKey(x => x.CartId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        // Seed: cart for user 2 (Bob - Buyer) with items
        b.Entity<Cart>().HasData(
            new Cart
            {
                Id = 1,
                UserId = 2,
                CreatedDate = new DateTime(2024, 6, 1, 0, 0, 0, DateTimeKind.Utc)
            }
        );

        b.Entity<CartItem>().HasData(
            new CartItem
            {
                Id = 1,
                CartId = 1,
                ProductId = 1,
                ProductName = "Samsung Galaxy S24",
                ProductImage = "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=400",
                Quantity = 1,
                UnitPrice = 189999m,
                AddedDate = new DateTime(2024, 6, 1, 10, 0, 0, DateTimeKind.Utc)
            },
            new CartItem
            {
                Id = 2,
                CartId = 1,
                ProductId = 3,
                ProductName = "Sony WH-1000XM5 Headphones",
                ProductImage = "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400",
                Quantity = 1,
                UnitPrice = 65999m,
                AddedDate = new DateTime(2024, 6, 1, 11, 0, 0, DateTimeKind.Utc)
            }
        );
    }
}
