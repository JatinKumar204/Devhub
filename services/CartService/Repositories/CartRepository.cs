using Microsoft.EntityFrameworkCore;
using CartService.Data;
using CartService.Models;

namespace CartService.Repositories;

public interface ICartRepository
{
    Task<Cart?> GetByUserIdAsync(int userId);
    Task<Cart> GetOrCreateAsync(int userId);
    Task<Cart> AddItemAsync(int userId, AddToCartDto dto);
    Task<Cart?> UpdateItemAsync(int userId, int productId, int quantity);
    Task<Cart?> RemoveItemAsync(int userId, int productId);
    Task<bool> ClearCartAsync(int userId);
}

public class CartRepository(CartDbContext db) : ICartRepository
{
    public async Task<Cart?> GetByUserIdAsync(int userId) =>
        await db.Carts
            .Include(c => c.Items)
            .FirstOrDefaultAsync(c => c.UserId == userId);

    public async Task<Cart> GetOrCreateAsync(int userId)
    {
        var cart = await GetByUserIdAsync(userId);
        if (cart is not null) return cart;

        cart = new Cart { UserId = userId };
        db.Carts.Add(cart);
        await db.SaveChangesAsync();
        return cart;
    }

    public async Task<Cart> AddItemAsync(int userId, AddToCartDto dto)
    {
        var cart = await GetOrCreateAsync(userId);

        var existing = cart.Items.FirstOrDefault(i => i.ProductId == dto.ProductId);
        if (existing is not null)
        {
            existing.Quantity += dto.Quantity;
            existing.UnitPrice = dto.UnitPrice; // update to latest price
        }
        else
        {
            cart.Items.Add(new CartItem
            {
                CartId = cart.Id,
                ProductId = dto.ProductId,
                ProductName = dto.ProductName,
                ProductImage = dto.ProductImage,
                Quantity = dto.Quantity,
                UnitPrice = dto.UnitPrice
            });
        }

        cart.UpdatedDate = DateTime.UtcNow;
        await db.SaveChangesAsync();

        return await GetByUserIdAsync(userId) ?? cart;
    }

    public async Task<Cart?> UpdateItemAsync(int userId, int productId, int quantity)
    {
        var cart = await GetByUserIdAsync(userId);
        if (cart is null) return null;

        var item = cart.Items.FirstOrDefault(i => i.ProductId == productId);
        if (item is null) return cart;

        if (quantity <= 0)
            cart.Items.Remove(item);
        else
            item.Quantity = quantity;

        cart.UpdatedDate = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return await GetByUserIdAsync(userId);
    }

    public async Task<Cart?> RemoveItemAsync(int userId, int productId)
    {
        var cart = await GetByUserIdAsync(userId);
        if (cart is null) return null;

        var item = cart.Items.FirstOrDefault(i => i.ProductId == productId);
        if (item is not null)
        {
            cart.Items.Remove(item);
            cart.UpdatedDate = DateTime.UtcNow;
            await db.SaveChangesAsync();
        }

        return await GetByUserIdAsync(userId);
    }

    public async Task<bool> ClearCartAsync(int userId)
    {
        var cart = await GetByUserIdAsync(userId);
        if (cart is null) return false;

        cart.Items.Clear();
        cart.UpdatedDate = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return true;
    }
}
