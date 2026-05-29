// services/ProductService/Controllers/ProductReviewsController.cs
// NEW FILE
//
// Routes:
//   Public:
//     GET  /api/products/{id}/reviews              — paginated reviews for a product
//     GET  /api/products/{id}/reviews/stats        — rating distribution
//
//   Buyer:
//     POST   /api/products/{id}/reviews            — submit review (one per product)
//     PUT    /api/products/{id}/reviews/{reviewId} — edit own review
//     DELETE /api/products/{id}/reviews/{reviewId} — delete own review
//
//   Seller:
//     GET  /api/seller/reviews                     — all reviews for seller's products
//     POST /api/products/{id}/reviews/{reviewId}/reply — respond to a review
//
//   Admin:
//     PUT  /api/products/{id}/reviews/{reviewId}/moderate — hide/unhide + note

using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProductService.Models;
using ProductService.Repositories;

namespace ProductService.Controllers;

[ApiController]
[Produces("application/json")]
public class ProductReviewsController(
    IProductReviewRepository reviewRepo,
    IProductRepository productRepo,
    ILogger<ProductReviewsController> logger) : ControllerBase
{
    private int    CallerId   => int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : 0;
    private string CallerName => User.FindFirstValue(ClaimTypes.Name) ?? "unknown";
    private bool   IsAdmin    => User.IsInRole("Admin");
    private bool   IsSeller   => User.IsInRole("Seller");
    private bool   IsBuyer    => User.IsInRole("Buyer");

    // ── Public: list reviews ──────────────────────────────────────────────────

    [HttpGet("api/products/{productId:int}/reviews")]
    public async Task<IActionResult> GetReviews(
        int productId,
        [FromQuery] int page     = 1,
        [FromQuery] int pageSize = 10)
    {
        var product = await productRepo.GetByIdAsync(productId);
        if (product is null)
            return NotFound(new { message = $"Product {productId} not found" });

        var (items, total) = await reviewRepo.GetByProductAsync(productId, page, pageSize);
        return Ok(new
        {
            items,
            total,
            page,
            pageSize,
            totalPages = (int)Math.Ceiling(total / (double)pageSize)
        });
    }

    [HttpGet("api/products/{productId:int}/reviews/stats")]
    public async Task<IActionResult> GetStats(int productId)
    {
        var stats = await reviewRepo.GetRatingStatsAsync(productId);
        return Ok(stats);
    }

    // ── Buyer: submit review ──────────────────────────────────────────────────

    [HttpPost("api/products/{productId:int}/reviews")]
    [Authorize(Roles = "Buyer")]
    public async Task<IActionResult> Create(int productId, [FromBody] CreateReviewDto dto)
    {
        if (dto.Rating is < 1 or > 5)
            return BadRequest(new { message = "Rating must be between 1 and 5" });

        if (string.IsNullOrWhiteSpace(dto.Title) || string.IsNullOrWhiteSpace(dto.Body))
            return BadRequest(new { message = "Title and body are required" });

        var product = await productRepo.GetByIdAsync(productId);
        if (product is null)
            return NotFound(new { message = $"Product {productId} not found" });

        if (await reviewRepo.HasReviewedAsync(productId, CallerId))
            return Conflict(new { message = "You have already reviewed this product. Edit your existing review instead." });

        var review = await reviewRepo.CreateAsync(productId, CallerId, CallerName, dto);

        logger.LogInformation(
            "Review {ReviewId} created for product {ProductId} by buyer {BuyerId}",
            review.Id, productId, CallerId);

        return CreatedAtAction(nameof(GetReviews), new { productId },
            new { review.Id, review.Rating, review.Title, review.BuyerName, review.CreatedDate });
    }

    // ── Buyer: edit own review ────────────────────────────────────────────────

    [HttpPut("api/products/{productId:int}/reviews/{reviewId:int}")]
    [Authorize(Roles = "Buyer")]
    public async Task<IActionResult> Update(int productId, int reviewId, [FromBody] UpdateReviewDto dto)
    {
        var updated = await reviewRepo.UpdateAsync(reviewId, CallerId, dto);
        if (updated is null)
            return NotFound(new { message = "Review not found or does not belong to you" });

        return Ok(new { updated.Id, updated.Rating, updated.Title, updated.UpdatedDate });
    }

    // ── Buyer or Admin: delete review ─────────────────────────────────────────

    [HttpDelete("api/products/{productId:int}/reviews/{reviewId:int}")]
    [Authorize(Roles = "Buyer,Admin")]
    public async Task<IActionResult> Delete(int productId, int reviewId)
    {
        var deleted = await reviewRepo.DeleteAsync(reviewId, CallerId, IsAdmin);
        if (!deleted)
            return NotFound(new { message = "Review not found or you do not have permission to delete it" });

        logger.LogInformation(
            "Review {ReviewId} deleted by {Role} {UserId}", reviewId, IsAdmin ? "Admin" : "Buyer", CallerId);

        return NoContent();
    }

    // ── Seller: view reviews on own products ──────────────────────────────────

    [HttpGet("api/seller/reviews")]
    [Authorize(Roles = "Seller")]
    public async Task<IActionResult> GetSellerReviews(
        [FromQuery] int  page             = 1,
        [FromQuery] int  pageSize         = 20,
        [FromQuery] bool pendingReplyOnly = false)
    {
        var (items, total) = await reviewRepo.GetBySellerAsync(CallerId, page, pageSize, pendingReplyOnly);
        return Ok(new
        {
            items,
            total,
            page,
            pageSize,
            totalPages = (int)Math.Ceiling(total / (double)pageSize)
        });
    }

    // ── Seller: reply to review ───────────────────────────────────────────────

    [HttpPost("api/products/{productId:int}/reviews/{reviewId:int}/reply")]
    [Authorize(Roles = "Seller,Admin")]
    public async Task<IActionResult> Reply(int productId, int reviewId, [FromBody] SellerReplyDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Reply))
            return BadRequest(new { message = "Reply cannot be empty" });

        // For admin, bypass seller ownership — use a dummy sellerId of 0
        var sellerId = IsAdmin ? 0 : CallerId;

        ProductService.Models.ProductReview? updated;
        if (IsAdmin)
        {
            // Admin can reply to any review — get the product's sellerId
            var review = await reviewRepo.GetRawAsync(reviewId);
            if (review is null)
                return NotFound(new { message = "Review not found" });
            var product = await productRepo.GetByIdAsync(review.ProductId);
            updated = await reviewRepo.AddSellerReplyAsync(reviewId, product?.SellerId ?? 0, dto);
        }
        else
        {
            updated = await reviewRepo.AddSellerReplyAsync(reviewId, sellerId, dto);
        }

        if (updated is null)
            return NotFound(new { message = "Review not found or this product does not belong to your store" });

        return Ok(new { updated.Id, updated.SellerReply, updated.SellerRepliedAt });
    }

    // ── Admin: moderate ───────────────────────────────────────────────────────

    [HttpPut("api/products/{productId:int}/reviews/{reviewId:int}/moderate")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Moderate(int productId, int reviewId, [FromBody] AdminModerateDto dto)
    {
        var updated = await reviewRepo.ModerateAsync(reviewId, dto, CallerName);
        if (updated is null)
            return NotFound(new { message = $"Review {reviewId} not found" });

        logger.LogInformation(
            "Review {ReviewId} moderated by admin {AdminId}: visible={Visible}",
            reviewId, CallerId, dto.IsVisible);

        return Ok(new { updated.Id, updated.IsVisible, updated.ModeratorNote });
    }
}
