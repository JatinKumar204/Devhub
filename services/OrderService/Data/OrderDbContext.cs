// Data/OrderDbContext.cs
using Microsoft.EntityFrameworkCore;
using OrderService.Models;

namespace OrderService.Data;

public class OrderDbContext(DbContextOptions<OrderDbContext> options) : DbContext(options)
{
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderLine> OrderLines => Set<OrderLine>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<Order>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.CustomerName).HasMaxLength(150).IsRequired();
            e.Property(x => x.PaymentMethod).HasMaxLength(50);
            e.Property(x => x.PaymentStatus).HasMaxLength(50);
            e.Property(x => x.TrackingNumber).HasMaxLength(100);
            e.Property(x => x.Notes).HasMaxLength(1000);
            e.Property(x => x.Total).HasColumnType("decimal(18,2)");
            e.Property(x => x.ShippingFee).HasColumnType("decimal(18,2)");
            e.Property(x => x.Discount).HasColumnType("decimal(18,2)");
            e.Property(x => x.Status).HasConversion<string>().HasMaxLength(20);
            e.Ignore(x => x.ItemCount);
            e.HasMany(x => x.Lines)
             .WithOne(x => x.Order)
             .HasForeignKey(x => x.OrderId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<OrderLine>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.ProductName).HasMaxLength(200).IsRequired();
            e.Property(x => x.UnitPrice).HasColumnType("decimal(18,2)");
            e.Ignore(x => x.LineTotal);
        });

        // ── Seed Data ────────────────────────────────────────────────────────
        b.Entity<Order>().HasData(
            new Order
            {
                Id = 1,
                CustomerId = 3,
                CustomerName = "Carol White",
                Status = OrderStatus.Completed,
                Total = 255998m,
                ShippingFee = 0m,
                Discount = 0m,
                PaymentMethod = "COD",
                PaymentStatus = "Paid",
                TrackingNumber = "DH-001-2024",
                EstimatedDelivery = new DateTime(2024, 6, 8, 0, 0, 0, DateTimeKind.Utc),
                DeliveredAt = new DateTime(2024, 6, 7, 0, 0, 0, DateTimeKind.Utc),
                CreatedDate = new DateTime(2024, 6, 1, 0, 0, 0, DateTimeKind.Utc)
            },
            new Order
            {
                Id = 2,
                CustomerId = 3,
                CustomerName = "Carol White",
                Status = OrderStatus.Processing,
                Total = 65999m,
                ShippingFee = 0m,
                Discount = 0m,
                PaymentMethod = "EasyPaisa",
                PaymentStatus = "Paid",
                EstimatedDelivery = new DateTime(2024, 6, 15, 0, 0, 0, DateTimeKind.Utc),
                CreatedDate = new DateTime(2024, 6, 10, 0, 0, 0, DateTimeKind.Utc)
            },
            new Order
            {
                Id = 3,
                CustomerId = 4,
                CustomerName = "David Khan",
                Status = OrderStatus.Pending,
                Total = 32498m,
                ShippingFee = 0m,
                Discount = 0m,
                PaymentMethod = "COD",
                PaymentStatus = "Pending",
                CreatedDate = new DateTime(2024, 6, 12, 0, 0, 0, DateTimeKind.Utc)
            },
            new Order
            {
                Id = 4,
                CustomerId = 4,
                CustomerName = "David Khan",
                Status = OrderStatus.Cancelled,
                Total = 24999m,
                ShippingFee = 0m,
                Discount = 0m,
                PaymentMethod = "Card",
                PaymentStatus = "Refunded",
                CreatedDate = new DateTime(2024, 5, 20, 0, 0, 0, DateTimeKind.Utc)
            }
        );

        b.Entity<OrderLine>().HasData(
            // Order 1 lines
            new OrderLine { Id = 1, OrderId = 1, ProductId = 1, ProductName = "Samsung Galaxy S24", Quantity = 1, UnitPrice = 189999m },
            new OrderLine { Id = 2, OrderId = 1, ProductId = 10, ProductName = "Logitech MX Master 3S Mouse", Quantity = 1, UnitPrice = 14999m },
            new OrderLine { Id = 3, OrderId = 1, ProductId = 8, ProductName = "The Pragmatic Programmer", Quantity = 1, UnitPrice = 3999m },
            // Order 2 lines
            new OrderLine { Id = 4, OrderId = 2, ProductId = 3, ProductName = "Sony WH-1000XM5 Headphones", Quantity = 1, UnitPrice = 65999m },
            // Order 3 lines
            new OrderLine { Id = 5, OrderId = 3, ProductId = 4, ProductName = "Nike Air Max 270", Quantity = 1, UnitPrice = 24999m },
            new OrderLine { Id = 6, OrderId = 3, ProductId = 7, ProductName = "Yoga Mat Premium Non-Slip", Quantity = 2, UnitPrice = 3499m },
            // Order 4 lines
            new OrderLine { Id = 7, OrderId = 4, ProductId = 12, ProductName = "Adidas Ultraboost 22", Quantity = 1, UnitPrice = 24999m }
        );
    }
}