using Microsoft.EntityFrameworkCore;
using UserService.Models;

namespace UserService.Data;

public class UserDbContext(DbContextOptions<UserDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(e =>
        {
            e.HasKey(u => u.Id);
            e.HasIndex(u => u.Email).IsUnique();
            e.Property(u => u.Name).HasMaxLength(200).IsRequired();
            e.Property(u => u.Email).HasMaxLength(320).IsRequired();
            // FIXED: Role now supports "Admin", "Seller", "Buyer" — increased max length
            e.Property(u => u.Role).HasMaxLength(50).HasDefaultValue("Buyer");
            e.Property(u => u.Department).HasMaxLength(100);
            e.Property(u => u.CreatedBy).HasMaxLength(200);
            e.Property(u => u.UpdatedBy).HasMaxLength(200);
        });

        // BCrypt hash of "Admin@123" and "User@123" (cost factor 11)
        const string adminHash = "$2a$11$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.";
        const string sellerHash = "$2a$11$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.";
        const string buyerHash = "$2a$11$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.";

        modelBuilder.Entity<User>().HasData(
            // Admin user
            new User
            {
                Id = 1,
                Name = "Alice Johnson",
                Email = "alice@example.com",
                PasswordHash = adminHash,
                Role = "Admin",
                Department = "Engineering",
                IsActive = true,
                CreatedDate = new DateTime(2024, 1, 15, 0, 0, 0, DateTimeKind.Utc),
                CreatedBy = "seed"
            },
            // Seller user
            new User
            {
                Id = 2,
                Name = "Bob's Store",
                Email = "bob@example.com",
                PasswordHash = sellerHash,
                Role = "Seller",
                Department = "Sales",
                IsActive = true,
                CreatedDate = new DateTime(2024, 3, 10, 0, 0, 0, DateTimeKind.Utc),
                CreatedBy = "seed"
            },
            // Buyer user
            new User
            {
                Id = 3,
                Name = "Carol White",
                Email = "carol@example.com",
                PasswordHash = buyerHash,
                Role = "Buyer",
                Department = "",
                IsActive = true,
                CreatedDate = new DateTime(2024, 5, 20, 0, 0, 0, DateTimeKind.Utc),
                CreatedBy = "seed"
            },
            // Extra buyers
            new User
            {
                Id = 4,
                Name = "David Khan",
                Email = "david@example.com",
                PasswordHash = buyerHash,
                Role = "Buyer",
                Department = "",
                IsActive = true,
                CreatedDate = new DateTime(2024, 6, 1, 0, 0, 0, DateTimeKind.Utc),
                CreatedBy = "seed"
            },
            // Extra seller
            new User
            {
                Id = 5,
                Name = "TechMart Official",
                Email = "techmart@example.com",
                PasswordHash = sellerHash,
                Role = "Seller",
                Department = "Retail",
                IsActive = true,
                CreatedDate = new DateTime(2024, 6, 5, 0, 0, 0, DateTimeKind.Utc),
                CreatedBy = "seed"
            }
        );
    }
}
