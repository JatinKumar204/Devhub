// services/ProductService/Repositories/ProductReviewRepository.cs
// NEW FILE

using Microsoft.EntityFrameworkCore;
using ProductService.Data;
using ProductService.Models;

namespace ProductService.Repositories;

public interface IProductReviewRepository
{
    Task<(IEnumerable<ReviewSummaryDto> Items, int Total)> GetByProductAsync(int productId, int page, int pageSize);
    Task<ReviewSummaryDto?> GetByIdAsync(int reviewId);
    Task<ProductReview?> GetRawAsync(int reviewId);
    Task<bool> HasReviewedAsync(int productId, int buyerId);
    Task<ProductReview> CreateAsync(int productId, int buyerId, string buyerName, CreateReviewDto dto);
    Task<ProductReview?> UpdateAsync(int reviewId, int buyerId, UpdateReviewDto dto);
    Task<bool> DeleteAsync(int reviewId, int buyerId, bool isAdmin);
    Task<ProductReview?> AddSellerReplyAsync(int reviewId, int sellerId, SellerReplyDto dto);
    Task<ProductReview?> ModerateAsync(int reviewId, AdminModerateDto dto, string moderatorName);
    Task<ProductRatingDto> GetRatingStatsAsync(int productId);
    // Seller's reviews across all their products
    Task<(IEnumerable<ReviewSummaryDto> Items, int Total)> GetBySellerAsync(int sellerId, int page, int pageSize, bool pendingReplyOnly);
}

public class ProductReviewRepository(ProductDbContext db) : IProductReviewRepository
{
    public async Task<(IEnumerable<ReviewSummaryDto> Items, int Total)> GetByProductAsync(
        int productId, int page, int pageSize)
    {
        var query = db.ProductReviews
            .Where(r => r.ProductId == productId && r.IsVisible)
            .OrderByDescending(r => r.CreatedDate);

        var total = await query.CountAsync();
        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return (items.Select(MapToDto), total);
    }

    public async Task<ReviewSummaryDto?> GetByIdAsync(int reviewId)
    {
        var r = await db.ProductReviews.FindAsync(reviewId);
        return r is null ? null : MapToDto(r);
    }

    public async Task<ProductReview?> GetRawAsync(int reviewId) =>
        await db.ProductReviews.FindAsync(reviewId);

    public async Task<bool> HasReviewedAsync(int productId, int buyerId) =>
        await db.ProductReviews.AnyAsync(r => r.ProductId == productId && r.BuyerId == buyerId);

    public async Task<ProductReview> CreateAsync(
        int productId, int buyerId, string buyerName, CreateReviewDto dto)
    {
        if (dto.Rating is < 1 or > 5)
            throw new ArgumentException("Rating must be between 1 and 5");

        var review = new ProductReview
        {
            ProductId   = productId,
            BuyerId     = buyerId,
            BuyerName   = buyerName,
            OrderId     = dto.OrderId,
            Rating      = dto.Rating,
            Title       = dto.Title.Trim(),
            Body        = dto.Body.Trim(),
            IsVisible   = true,
            CreatedBy   = buyerName,
            CreatedDate = DateTime.UtcNow
        };

        db.ProductReviews.Add(review);
        await db.SaveChangesAsync();
        await _recalculateRatingAsync(productId);
        return review;
    }

    public async Task<ProductReview?> UpdateAsync(int reviewId, int buyerId, UpdateReviewDto dto)
    {
        var review = await db.ProductReviews
            .FirstOrDefaultAsync(r => r.Id == reviewId && r.BuyerId == buyerId);

        if (review is null) return null;

        if (dto.Rating.HasValue)
        {
            if (dto.Rating.Value is < 1 or > 5)
                throw new ArgumentException("Rating must be between 1 and 5");
            review.Rating = dto.Rating.Value;
        }
        if (dto.Title is not null) review.Title = dto.Title.Trim();
        if (dto.Body  is not null) review.Body  = dto.Body.Trim();

        review.UpdatedDate = DateTime.UtcNow;
        await db.SaveChangesAsync();
        await _recalculateRatingAsync(review.ProductId);
        return review;
    }

    public async Task<bool> DeleteAsync(int reviewId, int buyerId, bool isAdmin)
    {
        var review = await db.ProductReviews.FindAsync(reviewId);
        if (review is null) return false;
        // Buyer can only delete own; admin can delete any
        if (!isAdmin && review.BuyerId != buyerId) return false;

        var productId = review.ProductId;
        db.ProductReviews.Remove(review);
        await db.SaveChangesAsync();
        await _recalculateRatingAsync(productId);
        return true;
    }

    public async Task<ProductReview?> AddSellerReplyAsync(
        int reviewId, int sellerId, SellerReplyDto dto)
    {
        var review = await db.ProductReviews
            .Include(r => r.Product)
            .FirstOrDefaultAsync(r => r.Id == reviewId);

        if (review is null) return null;
        // Only the seller who owns this product can reply
        if (review.Product.SellerId != sellerId) return null;

        review.SellerReply       = dto.Reply.Trim();
        review.SellerRepliedAt   = DateTime.UtcNow;
        review.SellerRepliedById = sellerId;
        review.UpdatedDate       = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return review;
    }

    public async Task<ProductReview?> ModerateAsync(
        int reviewId, AdminModerateDto dto, string moderatorName)
    {
        var review = await db.ProductReviews.FindAsync(reviewId);
        if (review is null) return null;

        var wasVisible    = review.IsVisible;
        review.IsVisible  = dto.IsVisible;
        review.ModeratorNote = dto.Note;
        review.UpdatedDate   = DateTime.UtcNow;
        review.UpdatedBy     = moderatorName;

        await db.SaveChangesAsync();

        // Re-aggregate if visibility changed
        if (wasVisible != dto.IsVisible)
            await _recalculateRatingAsync(review.ProductId);

        return review;
    }

    public async Task<ProductRatingDto> GetRatingStatsAsync(int productId)
    {
        var reviews = await db.ProductReviews
            .Where(r => r.ProductId == productId && r.IsVisible)
            .Select(r => r.Rating)
            .ToListAsync();

        var total = reviews.Count;
        var avg   = total > 0 ? Math.Round(reviews.Average(), 2) : 0;

        var dist = new Dictionary<int, int> { { 5, 0 }, { 4, 0 }, { 3, 0 }, { 2, 0 }, { 1, 0 } };
        foreach (var r in reviews) dist[r]++;

        return new ProductRatingDto
        {
            AverageRating  = (decimal)avg,
            TotalReviews   = total,
            Distribution   = dist
        };
    }

    public async Task<(IEnumerable<ReviewSummaryDto> Items, int Total)> GetBySellerAsync(
        int sellerId, int page, int pageSize, bool pendingReplyOnly)
    {
        var query = db.ProductReviews
            .Include(r => r.Product)
            .Where(r => r.Product.SellerId == sellerId && r.IsVisible);

        if (pendingReplyOnly)
            query = query.Where(r => r.SellerReply == null);

        query = query.OrderByDescending(r => r.CreatedDate);

        var total = await query.CountAsync();
        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return (items.Select(MapToDto), total);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private async Task _recalculateRatingAsync(int productId)
    {
        var stats = await db.ProductReviews
            .Where(r => r.ProductId == productId && r.IsVisible)
            .GroupBy(_ => 1)
            .Select(g => new { Avg = (decimal?)g.Average(r => r.Rating), Count = g.Count() })
            .FirstOrDefaultAsync();

        var product = await db.Products.FindAsync(productId);
        if (product is null) return;

        product.Rating      = Math.Round(stats?.Avg ?? 0, 2);
        product.ReviewCount = stats?.Count ?? 0;
        await db.SaveChangesAsync();
    }

    private static ReviewSummaryDto MapToDto(ProductReview r) => new()
    {
        Id               = r.Id,
        ProductId        = r.ProductId,
        BuyerId          = r.BuyerId,
        BuyerName        = r.BuyerName,
        Rating           = r.Rating,
        Title            = r.Title,
        Body             = r.Body,
        IsVerifiedBuyer  = r.OrderId.HasValue,
        SellerReply      = r.SellerReply,
        SellerRepliedAt  = r.SellerRepliedAt,
        CreatedDate      = r.CreatedDate,
        UpdatedDate      = r.UpdatedDate
    };
}
