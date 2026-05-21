using Microsoft.EntityFrameworkCore;
using CategoryService.Models;
using Microsoft.EntityFrameworkCore.Design;

namespace CategoryService.Data;

public class CategoryDbContext(DbContextOptions<CategoryDbContext> options) : DbContext(options)
{
    public DbSet<Category> Categories => Set<Category>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<Category>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Name).HasMaxLength(100).IsRequired();
            e.Property(x => x.Slug).HasMaxLength(100).IsRequired();
            e.Property(x => x.Description).HasMaxLength(500);
            e.Property(x => x.CreatedBy).HasMaxLength(200);
            e.Property(x => x.UpdatedBy).HasMaxLength(200);
            e.HasIndex(x => x.Slug).IsUnique();
            e.HasOne(x => x.Parent)
             .WithMany(x => x.Children)
             .HasForeignKey(x => x.ParentId)
             .OnDelete(DeleteBehavior.Restrict);
        });

        // Seed top-level categories
        b.Entity<Category>().HasData(
            new Category { Id = 1, Name = "Electronics", Slug = "electronics", Description = "Phones, laptops, accessories and more", SortOrder = 1, IsActive = true, CreatedDate = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc), CreatedBy = "seed" },
            new Category { Id = 2, Name = "Fashion", Slug = "fashion", Description = "Clothing, shoes, and accessories", SortOrder = 2, IsActive = true, CreatedDate = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc), CreatedBy = "seed" },
            new Category { Id = 3, Name = "Home & Kitchen", Slug = "home-kitchen", Description = "Furniture, appliances, and decor", SortOrder = 3, IsActive = true, CreatedDate = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc), CreatedBy = "seed" },
            new Category { Id = 4, Name = "Sports & Outdoors", Slug = "sports-outdoors", Description = "Sports gear and outdoor equipment", SortOrder = 4, IsActive = true, CreatedDate = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc), CreatedBy = "seed" },
            new Category { Id = 5, Name = "Books", Slug = "books", Description = "Fiction, non-fiction, textbooks", SortOrder = 5, IsActive = true, CreatedDate = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc), CreatedBy = "seed" },
            new Category { Id = 6, Name = "Beauty", Slug = "beauty", Description = "Skincare, makeup, and fragrances", SortOrder = 6, IsActive = true, CreatedDate = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc), CreatedBy = "seed" },
            new Category { Id = 7, Name = "Toys & Games", Slug = "toys-games", Description = "Toys, board games, and video games", SortOrder = 7, IsActive = true, CreatedDate = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc), CreatedBy = "seed" },
            new Category { Id = 8, Name = "Automotive", Slug = "automotive", Description = "Car accessories and tools", SortOrder = 8, IsActive = true, CreatedDate = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc), CreatedBy = "seed" },

            // Sub-categories for Electronics (ParentId = 1)
            new Category { Id = 10, Name = "Smartphones", Slug = "smartphones", Description = "Android and iOS phones", SortOrder = 1, IsActive = true, ParentId = 1, CreatedDate = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc), CreatedBy = "seed" },
            new Category { Id = 11, Name = "Laptops", Slug = "laptops", Description = "Notebooks and ultrabooks", SortOrder = 2, IsActive = true, ParentId = 1, CreatedDate = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc), CreatedBy = "seed" },
            new Category { Id = 12, Name = "Audio", Slug = "audio", Description = "Headphones, speakers, earbuds", SortOrder = 3, IsActive = true, ParentId = 1, CreatedDate = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc), CreatedBy = "seed" },
            new Category { Id = 13, Name = "Cameras", Slug = "cameras", Description = "DSLR, mirrorless, and action cameras", SortOrder = 4, IsActive = true, ParentId = 1, CreatedDate = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc), CreatedBy = "seed" }
        );
    }
}

public class CategoryDbContextFactory : IDesignTimeDbContextFactory<CategoryDbContext>
{
    public CategoryDbContext CreateDbContext(string[] args)
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

        var optionsBuilder = new DbContextOptionsBuilder<CategoryDbContext>();
        optionsBuilder.UseSqlServer(connectionString);

        return new CategoryDbContext(optionsBuilder.Options);
    }
}
