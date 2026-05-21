using Microsoft.EntityFrameworkCore;
using CategoryService.Data;
using CategoryService.Models;

namespace CategoryService.Repositories;

public interface ICategoryRepository
{
    Task<IEnumerable<Category>> GetAllAsync(bool? isActive = null);
    Task<IEnumerable<Category>> GetTopLevelAsync();
    Task<Category?> GetByIdAsync(int id);
    Task<Category?> GetBySlugAsync(string slug);
    Task<Category> CreateAsync(CreateCategoryDto dto, string createdBy);
    Task<Category?> UpdateAsync(int id, UpdateCategoryDto dto, string updatedBy);
    Task<bool> DeleteAsync(int id);
}

public class CategoryRepository(CategoryDbContext db) : ICategoryRepository
{
    public async Task<IEnumerable<Category>> GetAllAsync(bool? isActive = null)
    {
        var query = db.Categories
            .Include(c => c.Parent)
            .Include(c => c.Children)
            .AsQueryable();

        if (isActive.HasValue)
            query = query.Where(c => c.IsActive == isActive.Value);

        return await query.OrderBy(c => c.SortOrder).ThenBy(c => c.Name).ToListAsync();
    }

    public async Task<IEnumerable<Category>> GetTopLevelAsync() =>
        await db.Categories
            .Include(c => c.Children.Where(x => x.IsActive))
            .Where(c => c.ParentId == null && c.IsActive)
            .OrderBy(c => c.SortOrder)
            .ToListAsync();

    public async Task<Category?> GetByIdAsync(int id) =>
        await db.Categories
            .Include(c => c.Parent)
            .Include(c => c.Children)
            .FirstOrDefaultAsync(c => c.Id == id);

    public async Task<Category?> GetBySlugAsync(string slug) =>
        await db.Categories
            .Include(c => c.Children.Where(x => x.IsActive))
            .FirstOrDefaultAsync(c => c.Slug == slug);

    public async Task<Category> CreateAsync(CreateCategoryDto dto, string createdBy)
    {
        var cat = new Category
        {
            Name = dto.Name,
            Slug = dto.Slug,
            Description = dto.Description,
            ImageUrl = dto.ImageUrl,
            ParentId = dto.ParentId,
            SortOrder = dto.SortOrder,
            CreatedBy = createdBy
        };
        db.Categories.Add(cat);
        await db.SaveChangesAsync();
        return cat;
    }

    public async Task<Category?> UpdateAsync(int id, UpdateCategoryDto dto, string updatedBy)
    {
        var cat = await db.Categories.FindAsync(id);
        if (cat is null) return null;

        if (dto.Name is not null) cat.Name = dto.Name;
        if (dto.Description is not null) cat.Description = dto.Description;
        if (dto.ImageUrl is not null) cat.ImageUrl = dto.ImageUrl;
        if (dto.SortOrder.HasValue) cat.SortOrder = dto.SortOrder.Value;
        if (dto.IsActive.HasValue) cat.IsActive = dto.IsActive.Value;
        cat.UpdatedDate = DateTime.UtcNow;
        cat.UpdatedBy = updatedBy;

        await db.SaveChangesAsync();
        return cat;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var cat = await db.Categories.FindAsync(id);
        if (cat is null) return false;
        db.Categories.Remove(cat);
        await db.SaveChangesAsync();
        return true;
    }
}
