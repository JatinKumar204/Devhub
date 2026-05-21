using Microsoft.EntityFrameworkCore;
using WishlistService.Data;
using WishlistService.Models;

namespace WishlistService.Repositories;

public interface IWishlistRepository
{
    Task<IEnumerable<WishlistItem>> GetByUserIdAsync(int userId);
    Task<WishlistItem?> GetItemAsync(int userId, int productId);
    Task<WishlistItem> AddAsync(int userId, AddWishlistItemDto dto);
    Task<bool> RemoveAsync(int userId, int productId);
    Task<bool> IsWishlistedAsync(int userId, int productId);
}

public class WishlistRepository(WishlistDbContext db) : IWishlistRepository
{
    public async Task<IEnumerable<WishlistItem>> GetByUserIdAsync(int userId) =>
        await db.WishlistItems
            .Where(w => w.UserId == userId)
            .OrderByDescending(w => w.AddedDate)
            .ToListAsync();

    public async Task<WishlistItem?> GetItemAsync(int userId, int productId) =>
        await db.WishlistItems
            .FirstOrDefaultAsync(w => w.UserId == userId && w.ProductId == productId);

    public async Task<WishlistItem> AddAsync(int userId, AddWishlistItemDto dto)
    {
        // Check if already wishlisted — return existing instead of throwing duplicate key
        var existing = await GetItemAsync(userId, dto.ProductId);
        if (existing is not null) return existing;

        var item = new WishlistItem
        {
            UserId = userId,
            ProductId = dto.ProductId,
            ProductName = dto.ProductName,
            ProductImage = dto.ProductImage,
            ProductPrice = dto.ProductPrice,
        };
        db.WishlistItems.Add(item);
        await db.SaveChangesAsync();
        return item;
    }

    public async Task<bool> RemoveAsync(int userId, int productId)
    {
        var item = await GetItemAsync(userId, productId);
        if (item is null) return false;
        db.WishlistItems.Remove(item);
        await db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> IsWishlistedAsync(int userId, int productId) =>
        await db.WishlistItems.AnyAsync(w => w.UserId == userId && w.ProductId == productId);
}