// services/UserService/Data/UserDbContext.cs
// Changes from previous version:
//   - Added DbSet<SellerProfile>, DbSet<SellerVerification>,
//     DbSet<VerificationDocument>, DbSet<VerificationStatusHistory>
//   - Added OnModelCreating configuration for all four new entities
//   - Existing Users table configuration and seed data are UNCHANGED
//   - Existing AuditableEntity pattern reused as-is

using Microsoft.EntityFrameworkCore;
using UserService.Models;

namespace UserService.Data;

public class UserDbContext(DbContextOptions<UserDbContext> options) : DbContext(options)
{
    // Existing
    public DbSet<User> Users => Set<User>();

    // New — Phase 1
    public DbSet<SellerProfile> SellerProfiles => Set<SellerProfile>();
    public DbSet<SellerVerification> SellerVerifications => Set<SellerVerification>();
    public DbSet<VerificationDocument> VerificationDocuments => Set<VerificationDocument>();
    public DbSet<VerificationStatusHistory> VerificationStatusHistories => Set<VerificationStatusHistory>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // ── Existing Users configuration (UNCHANGED) ──────────────────────────
        modelBuilder.Entity<User>(e =>
        {
            e.HasKey(u => u.Id);
            e.HasIndex(u => u.Email).IsUnique();
            e.Property(u => u.Name).HasMaxLength(200).IsRequired();
            e.Property(u => u.Email).HasMaxLength(320).IsRequired();
            e.Property(u => u.Role).HasMaxLength(50).HasDefaultValue("Buyer");
            e.Property(u => u.Department).HasMaxLength(100);
            e.Property(u => u.CreatedBy).HasMaxLength(200);
            e.Property(u => u.UpdatedBy).HasMaxLength(200);
        });

        // Seed data preserved exactly as-is
        const string hash = "$2a$11$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.";
        modelBuilder.Entity<User>().HasData(
            new User { Id = 1, Name = "Alice Johnson", Email = "alice@example.com", PasswordHash = hash, Role = "Admin", Department = "Engineering", IsActive = true, CreatedDate = new DateTime(2024, 1, 15, 0, 0, 0, DateTimeKind.Utc), CreatedBy = "seed" },
            new User { Id = 2, Name = "Bob's Store", Email = "bob@example.com", PasswordHash = hash, Role = "Seller", Department = "Sales", IsActive = true, CreatedDate = new DateTime(2024, 3, 10, 0, 0, 0, DateTimeKind.Utc), CreatedBy = "seed" },
            new User { Id = 3, Name = "Carol White", Email = "carol@example.com", PasswordHash = hash, Role = "Buyer", Department = "", IsActive = true, CreatedDate = new DateTime(2024, 5, 20, 0, 0, 0, DateTimeKind.Utc), CreatedBy = "seed" },
            new User { Id = 4, Name = "David Khan", Email = "david@example.com", PasswordHash = hash, Role = "Buyer", Department = "", IsActive = true, CreatedDate = new DateTime(2024, 6, 1, 0, 0, 0, DateTimeKind.Utc), CreatedBy = "seed" },
            new User { Id = 5, Name = "TechMart Official", Email = "techmart@example.com", PasswordHash = hash, Role = "Seller", Department = "Retail", IsActive = true, CreatedDate = new DateTime(2024, 6, 5, 0, 0, 0, DateTimeKind.Utc), CreatedBy = "seed" }
        );

        // ── SellerProfile ──────────────────────────────────────────────────────
        modelBuilder.Entity<SellerProfile>(e =>
        {
            e.HasKey(sp => sp.UserId);  // UserId is the PK — enforces 1:1

            e.HasOne(sp => sp.User)
             .WithOne()
             .HasForeignKey<SellerProfile>(sp => sp.UserId)
             .OnDelete(DeleteBehavior.Cascade);

            e.Property(sp => sp.StoreName).HasMaxLength(200).IsRequired();
            e.Property(sp => sp.StoreDescription).HasMaxLength(1000);
            e.Property(sp => sp.StoreLogoUrl).HasMaxLength(500);
            e.Property(sp => sp.PhoneNumber).HasMaxLength(20).IsRequired();
            e.Property(sp => sp.AddressLine1).HasMaxLength(300).IsRequired();
            e.Property(sp => sp.AddressLine2).HasMaxLength(300);
            e.Property(sp => sp.City).HasMaxLength(100).IsRequired();
            e.Property(sp => sp.Province).HasMaxLength(100).IsRequired();
            e.Property(sp => sp.PostalCode).HasMaxLength(20).IsRequired();
            e.Property(sp => sp.Country).HasMaxLength(100).HasDefaultValue("Pakistan");
            e.Property(sp => sp.BankName).HasMaxLength(200);
            e.Property(sp => sp.AccountTitle).HasMaxLength(200);
            e.Property(sp => sp.AccountNumber).HasMaxLength(50);
            e.Property(sp => sp.IbanNumber).HasMaxLength(50);
            e.Property(sp => sp.NtnNumber).HasMaxLength(50);
            e.Property(sp => sp.SalesTaxNumber).HasMaxLength(50);
            e.Property(sp => sp.CreatedBy).HasMaxLength(200);
            e.Property(sp => sp.UpdatedBy).HasMaxLength(200);

            // Seed profiles for the two existing seed sellers
            e.HasData(
                new SellerProfile
                {
                    UserId = 2,
                    StoreName = "Bob's Store",
                    PhoneNumber = "03001234567",
                    AddressLine1 = "123 Main Street",
                    City = "Karachi",
                    Province = "Sindh",
                    PostalCode = "75500",
                    Country = "Pakistan",
                    CreatedDate = new DateTime(2024, 3, 10, 0, 0, 0, DateTimeKind.Utc),
                    CreatedBy = "seed"
                },
                new SellerProfile
                {
                    UserId = 5,
                    StoreName = "TechMart Official",
                    PhoneNumber = "03119876543",
                    AddressLine1 = "456 Tech Avenue",
                    City = "Lahore",
                    Province = "Punjab",
                    PostalCode = "54000",
                    Country = "Pakistan",
                    CreatedDate = new DateTime(2024, 6, 5, 0, 0, 0, DateTimeKind.Utc),
                    CreatedBy = "seed"
                }
            );
        });

        // ── SellerVerification ────────────────────────────────────────────────
        modelBuilder.Entity<SellerVerification>(e =>
        {
            e.HasKey(sv => sv.Id);

            e.HasOne(sv => sv.User)
             .WithOne()
             .HasForeignKey<SellerVerification>(sv => sv.UserId)
             .OnDelete(DeleteBehavior.Cascade);

            // Navigation to SellerProfile goes through UserId — configured via FK
            e.HasOne(sv => sv.SellerProfile)
             .WithOne(sp => sp.Verification)
             .HasForeignKey<SellerVerification>(sv => sv.UserId)
             .OnDelete(DeleteBehavior.NoAction);  // cascade already handled by User→SellerProfile

            e.Property(sv => sv.Status)
             .HasConversion<string>()   // store as string so migrations are readable
             .HasMaxLength(30);

            e.Property(sv => sv.SubmissionCount).HasDefaultValue(1);
            e.Property(sv => sv.CreatedBy).HasMaxLength(200);
            e.Property(sv => sv.UpdatedBy).HasMaxLength(200);

            // Index for admin dashboard queries (list by status, order by submitted date)
            e.HasIndex(sv => sv.Status);
            e.HasIndex(sv => sv.SubmittedAt);

            // Seed: existing sellers get an Approved verification record
            // so they can continue to list products without disruption
            e.HasData(
                new SellerVerification
                {
                    Id = 1,
                    UserId = 2,
                    Status = VerificationStatus.Approved,
                    SubmissionCount = 1,
                    SubmittedAt = new DateTime(2024, 3, 10, 0, 0, 0, DateTimeKind.Utc),
                    ReviewedByAdminId = 1,
                    ReviewedAt = new DateTime(2024, 3, 11, 0, 0, 0, DateTimeKind.Utc),
                    CreatedDate = new DateTime(2024, 3, 10, 0, 0, 0, DateTimeKind.Utc),
                    CreatedBy = "seed"
                },
                new SellerVerification
                {
                    Id = 2,
                    UserId = 5,
                    Status = VerificationStatus.Approved,
                    SubmissionCount = 1,
                    SubmittedAt = new DateTime(2024, 6, 5, 0, 0, 0, DateTimeKind.Utc),
                    ReviewedByAdminId = 1,
                    ReviewedAt = new DateTime(2024, 6, 6, 0, 0, 0, DateTimeKind.Utc),
                    CreatedDate = new DateTime(2024, 6, 5, 0, 0, 0, DateTimeKind.Utc),
                    CreatedBy = "seed"
                }
            );
        });

        // ── VerificationDocument ──────────────────────────────────────────────
        modelBuilder.Entity<VerificationDocument>(e =>
        {
            e.HasKey(vd => vd.Id);

            e.HasOne(vd => vd.Verification)
             .WithMany(sv => sv.Documents)
             .HasForeignKey(vd => vd.VerificationId)
             .OnDelete(DeleteBehavior.Cascade);

            e.Property(vd => vd.DocumentType)
             .HasConversion<string>()
             .HasMaxLength(50);

            e.Property(vd => vd.Status)
             .HasConversion<string>()
             .HasMaxLength(20);

            e.Property(vd => vd.FilePath).HasMaxLength(500).IsRequired();
            e.Property(vd => vd.OriginalFileName).HasMaxLength(260);
            e.Property(vd => vd.ContentType).HasMaxLength(100);
            e.Property(vd => vd.Notes).HasMaxLength(500);
            e.Property(vd => vd.CreatedBy).HasMaxLength(200);
            e.Property(vd => vd.UpdatedBy).HasMaxLength(200);

            // Index for quickly loading active docs for a verification
            e.HasIndex(vd => new { vd.VerificationId, vd.Status });
        });

        // ── VerificationStatusHistory ─────────────────────────────────────────
        modelBuilder.Entity<VerificationStatusHistory>(e =>
        {
            e.HasKey(h => h.Id);

            e.HasOne(h => h.Verification)
             .WithMany(sv => sv.StatusHistory)
             .HasForeignKey(h => h.VerificationId)
             .OnDelete(DeleteBehavior.Cascade);

            e.Property(h => h.FromStatus)
             .HasConversion<string>()
             .HasMaxLength(30);

            e.Property(h => h.ToStatus)
             .HasConversion<string>()
             .HasMaxLength(30);

            e.Property(h => h.ChangedByName).HasMaxLength(200);
            e.Property(h => h.Comment).HasMaxLength(2000);

            // Index for timeline queries (most recent first per verification)
            e.HasIndex(h => new { h.VerificationId, h.ChangedAt });

            // Seed: approval history for existing seed sellers
            e.HasData(
                new VerificationStatusHistory
                {
                    Id = 1,
                    VerificationId = 1,
                    FromStatus = VerificationStatus.PendingApproval,
                    ToStatus = VerificationStatus.Approved,
                    ChangedByUserId = 1,
                    ChangedByName = "Alice Johnson",
                    ChangedAt = new DateTime(2024, 3, 11, 0, 0, 0, DateTimeKind.Utc),
                    Comment = "Verified via seed data migration"
                },
                new VerificationStatusHistory
                {
                    Id = 2,
                    VerificationId = 2,
                    FromStatus = VerificationStatus.PendingApproval,
                    ToStatus = VerificationStatus.Approved,
                    ChangedByUserId = 1,
                    ChangedByName = "Alice Johnson",
                    ChangedAt = new DateTime(2024, 6, 6, 0, 0, 0, DateTimeKind.Utc),
                    Comment = "Verified via seed data migration"
                }
            );
        });
        modelBuilder.Entity<Notification>(e =>
        {
            e.HasKey(n => n.Id);
            e.Property(n => n.Title).HasMaxLength(200).IsRequired();
            e.Property(n => n.Body).HasMaxLength(1000).IsRequired();
            e.Property(n => n.ActionUrl).HasMaxLength(300);
            e.Property(n => n.EntityType).HasMaxLength(50);
            e.Property(n => n.Type).HasConversion<string>().HasMaxLength(50);

            // Primary query: all unread for a user, newest first
            e.HasIndex(n => new { n.UserId, n.IsRead, n.CreatedDate });
        });
        modelBuilder.Entity<RefreshToken>(e =>
        {
            e.HasKey(t => t.Id);

            e.HasOne(t => t.User)
             .WithMany()
             .HasForeignKey(t => t.UserId)
             .OnDelete(DeleteBehavior.Cascade);

            e.Property(t => t.Token).HasMaxLength(200).IsRequired();
            e.Property(t => t.CreatedByIp).HasMaxLength(45);
            e.Property(t => t.RevokedReason).HasMaxLength(200);

            // Fast lookup by token value
            e.HasIndex(t => t.Token).IsUnique();

            // Cleanup queries: find active tokens for a user
            e.HasIndex(t => new { t.UserId, t.IsRevoked, t.IsUsed });
        });
    }
}
