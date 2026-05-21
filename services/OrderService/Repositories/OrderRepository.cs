// Repositories/OrderRepository.cs — REPLACE EXISTING FILE
using Microsoft.EntityFrameworkCore;
using OrderService.Data;
using OrderService.Models;

namespace OrderService.Repositories;

public interface IOrderRepository
{
    Task<IEnumerable<Order>> GetAllAsync(int page, int pageSize, string? status, int? customerId, int? sellerId);
    Task<Order?> GetByIdAsync(int id);
    Task<Order> CreateAsync(CreateOrderDto dto);
    Task<Order?> UpdateStatusAsync(int id, string status);
    Task<bool> DeleteAsync(int id);
}

public class OrderRepository(OrderDbContext db) : IOrderRepository
{
    public async Task<IEnumerable<Order>> GetAllAsync(
    int page,
    int pageSize,
    string? status,
    int? customerId,
    int? sellerId)
    {
        // Base query (EF fallback for non-seller flows)
        IQueryable<Order> query = db.Orders
            .Include(o => o.Lines)
            .AsQueryable();

        // Status filter
        if (!string.IsNullOrWhiteSpace(status) &&
            Enum.TryParse<OrderStatus>(status, true, out var s))
        {
            query = query.Where(o => o.Status == s);
        }

        // Buyer filter
        if (customerId.HasValue)
        {
            query = query.Where(o => o.CustomerId == customerId.Value);
        }

        // SELLER FLOW (RAW SQL overrides EF query)
        if (sellerId.HasValue)
        {
            query = db.Orders
                .FromSqlRaw(@"
                SELECT DISTINCT o.*
                FROM dbo.Orders o
                JOIN dbo.OrderLines ol ON o.Id = ol.OrderId
                WHERE EXISTS (
                    SELECT 1
                    FROM dbo.Products p
                    WHERE p.Id = ol.ProductId
                      AND p.SellerId = {0}
                )", sellerId.Value)
                .Include(o => o.Lines);

            // re-apply status filter (because query was reset)
            if (!string.IsNullOrWhiteSpace(status) &&
                Enum.TryParse<OrderStatus>(status, true, out var s2))
            {
                query = query.Where(o => o.Status == s2);
            }

            // IMPORTANT: customer filter usually not needed for seller,
            // but if you want to keep it:
            if (customerId.HasValue)
            {
                query = query.Where(o => o.CustomerId == customerId.Value);
            }
        }

        return await query
            .OrderByDescending(o => o.CreatedDate)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();
    }

    public async Task<Order?> GetByIdAsync(int id) =>
        await db.Orders.Include(o => o.Lines).FirstOrDefaultAsync(o => o.Id == id);

    public async Task<Order> CreateAsync(CreateOrderDto dto)
    {
        var order = new Order
        {
            CustomerId = dto.CustomerId,
            CustomerName = dto.CustomerName,
            PaymentMethod = dto.PaymentMethod,
            ShippingFee = dto.ShippingFee,
            Discount = dto.Discount,
            ShippingAddressId = dto.ShippingAddressId,
            Notes = dto.Notes,
            EstimatedDelivery = DateTime.UtcNow.AddDays(5),
            Lines = dto.Lines.Select(l => new OrderLine
            {
                ProductId = l.ProductId,
                ProductName = l.ProductName,
                Quantity = l.Quantity,
                UnitPrice = l.UnitPrice
            }).ToList()
        };

        order.Total = order.Lines.Sum(l => l.Quantity * l.UnitPrice) + dto.ShippingFee - dto.Discount;

        db.Orders.Add(order);
        await db.SaveChangesAsync();
        return order;
    }

    public async Task<Order?> UpdateStatusAsync(int id, string status)
    {
        var order = await db.Orders.Include(o => o.Lines).FirstOrDefaultAsync(o => o.Id == id);
        if (order is null) return null;

        if (Enum.TryParse<OrderStatus>(status, true, out var parsed))
        {
            order.Status = parsed;
            order.UpdatedDate = DateTime.UtcNow;

            if (parsed == OrderStatus.Completed)
                order.DeliveredAt = DateTime.UtcNow;

            await db.SaveChangesAsync();
        }

        return order;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var order = await db.Orders.FindAsync(id);
        if (order is null) return false;
        db.Orders.Remove(order);
        await db.SaveChangesAsync();
        return true;
    }
}
