// services/OrderService/Controllers/AnalyticsController.cs
// NEW FILE
//
// Routes (all require Auth):
//   GET /api/analytics/revenue          — daily/weekly/monthly revenue totals
//   GET /api/analytics/orders           — order counts by status over time
//   GET /api/analytics/top-products     — top selling products by revenue
//
// Seller: scoped to their own orders (SellerId filter applied automatically)
// Admin:  sees platform-wide data (or filtered by sellerId query param)

using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OrderService.Data;
using OrderService.Models;

namespace OrderService.Controllers;

[ApiController]
[Route("api/analytics")]
[Authorize]
[Produces("application/json")]
public class AnalyticsController(
    OrderDbContext db,
    ILogger<AnalyticsController> logger) : ControllerBase
{
    private int  UserId   => int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : 0;
    private bool IsAdmin  => User.IsInRole("Admin");
    private bool IsSeller => User.IsInRole("Seller");

    // ── Revenue summary ───────────────────────────────────────────────────────

    /// <summary>
    /// Returns daily revenue for the last N days.
    /// Seller: their own shipment lines only.
    /// Admin: platform-wide (or filter by sellerId param).
    /// </summary>
    [HttpGet("revenue")]
    public async Task<IActionResult> Revenue(
        [FromQuery] int    days     = 30,
        [FromQuery] int?   sellerId = null)
    {
        days = Math.Clamp(days, 7, 365);

        var effectiveSellerId = IsAdmin
            ? sellerId                  // admin can filter or see all
            : (int?)UserId;             // seller always scoped to self

        var from = DateTime.UtcNow.AddDays(-days).Date;

        // Build the base query over completed orders
        var query = db.Orders
            .Where(o => o.Status == OrderStatus.Completed &&
                        o.CreatedDate >= from);

        if (effectiveSellerId.HasValue)
            query = query.Where(o =>
                o.Lines.Any(l => l.SellerId == effectiveSellerId.Value));

        var orders = await query
            .Include(o => o.Lines)
            .ToListAsync();

        // Daily revenue grouped in memory (avoids complex SQL date functions)
        var dailyRevenue = Enumerable
            .Range(0, days)
            .Select(i => DateTime.UtcNow.AddDays(-days + i + 1).Date)
            .Select(date =>
            {
                var dayOrders = orders.Where(o => o.CreatedDate.Date == date);
                decimal rev;
                if (effectiveSellerId.HasValue)
                {
                    // Only count lines belonging to this seller
                    rev = dayOrders.Sum(o =>
                        o.Lines
                            .Where(l => l.SellerId == effectiveSellerId.Value)
                            .Sum(l => l.Quantity * l.UnitPrice));
                }
                else
                {
                    rev = dayOrders.Sum(o => o.Total);
                }
                return new
                {
                    date    = date.ToString("yyyy-MM-dd"),
                    revenue = rev,
                    orders  = dayOrders.Count()
                };
            })
            .ToList();

        var totalRevenue = dailyRevenue.Sum(d => d.revenue);
        var totalOrders  = dailyRevenue.Sum(d => d.orders);

        // Weekly buckets for the summary card
        var weeklyRevenue = dailyRevenue
            .GroupBy(d => CultureWeek(DateTime.Parse(d.date)))
            .Select(g => new
            {
                week    = g.Key,
                revenue = g.Sum(x => x.revenue),
                orders  = g.Sum(x => x.orders)
            })
            .OrderBy(w => w.week)
            .ToList();

        return Ok(new
        {
            period       = $"Last {days} days",
            totalRevenue,
            totalOrders,
            daily        = dailyRevenue,
            weekly       = weeklyRevenue
        });
    }

    // ── Order stats ───────────────────────────────────────────────────────────

    [HttpGet("orders")]
    public async Task<IActionResult> OrderStats([FromQuery] int? sellerId = null)
    {
        var effectiveSellerId = IsAdmin ? sellerId : (int?)UserId;

        var query = db.Orders.Include(o => o.Lines).AsQueryable();

        if (effectiveSellerId.HasValue)
            query = query.Where(o =>
                o.Lines.Any(l => l.SellerId == effectiveSellerId.Value));

        var orders = await query.ToListAsync();

        var byStatus = new Dictionary<string, int>
        {
            { "Pending",    orders.Count(o => o.Status == OrderStatus.Pending) },
            { "Processing", orders.Count(o => o.Status == OrderStatus.Processing) },
            { "Completed",  orders.Count(o => o.Status == OrderStatus.Completed) },
            { "Cancelled",  orders.Count(o => o.Status == OrderStatus.Cancelled) },
        };

        var completedOrders = orders.Where(o => o.Status == OrderStatus.Completed).ToList();
        decimal avgOrderValue = completedOrders.Any()
            ? completedOrders.Average(o => o.Total)
            : 0;

        // Last 12 months trend
        var monthlyTrend = Enumerable.Range(0, 12)
            .Select(i =>
            {
                var month = DateTime.UtcNow.AddMonths(-11 + i);
                var count = orders.Count(o =>
                    o.CreatedDate.Year  == month.Year &&
                    o.CreatedDate.Month == month.Month);
                var rev = completedOrders
                    .Where(o => o.CreatedDate.Year  == month.Year &&
                                o.CreatedDate.Month == month.Month)
                    .Sum(o => o.Total);
                return new
                {
                    month   = month.ToString("MMM yyyy"),
                    orders  = count,
                    revenue = rev
                };
            })
            .ToList();

        return Ok(new
        {
            totalOrders    = orders.Count,
            byStatus,
            avgOrderValue  = Math.Round(avgOrderValue, 2),
            completionRate = orders.Any()
                ? Math.Round((double)byStatus["Completed"] / orders.Count * 100, 1)
                : 0,
            monthlyTrend
        });
    }

    // ── Top products ──────────────────────────────────────────────────────────

    [HttpGet("top-products")]
    public async Task<IActionResult> TopProducts(
        [FromQuery] int  count    = 10,
        [FromQuery] int? sellerId = null)
    {
        var effectiveSellerId = IsAdmin ? sellerId : (int?)UserId;
        count = Math.Clamp(count, 5, 50);

        var lineQuery = db.Orders
            .Where(o => o.Status == OrderStatus.Completed)
            .SelectMany(o => o.Lines);

        if (effectiveSellerId.HasValue)
            lineQuery = lineQuery.Where(l => l.SellerId == effectiveSellerId.Value);

        var top = await lineQuery
            .GroupBy(l => new { l.ProductId, l.ProductName })
            .Select(g => new
            {
                productId   = g.Key.ProductId,
                productName = g.Key.ProductName,
                unitsSold   = g.Sum(l => l.Quantity),
                revenue     = g.Sum(l => l.Quantity * l.UnitPrice)
            })
            .OrderByDescending(x => x.revenue)
            .Take(count)
            .ToListAsync();

        return Ok(new { count = top.Count, products = top });
    }

    // ── Helper ────────────────────────────────────────────────────────────────
    private static int CultureWeek(DateTime date) =>
        System.Globalization.CultureInfo.InvariantCulture.Calendar
            .GetWeekOfYear(date,
                System.Globalization.CalendarWeekRule.FirstFourDayWeek,
                DayOfWeek.Monday);
}
