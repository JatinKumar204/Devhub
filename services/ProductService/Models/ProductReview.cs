// services/ProductService/Models/ProductReview.cs
// NEW FILE — drop alongside existing Product.cs
//
// Design decisions:
//   - ProductReview is owned by ProductService — rating aggregation happens here
//   - OrderId stored on review for purchase proof (soft validation — no cross-service call)
//   - One review per buyer per product enforced by unique index (ProductId, BuyerId)
//   - Seller can add one reply per review
//   - Rating updates Product.Rating + Product.ReviewCount atomically after insert/delete
//   - Reviews can be hidden by admin without deletion (IsVisible flag)

namespace ProductService.Models;

public class ProductReview : AuditableEntity
{
    public int     Id          { get; set; }
    public int     ProductId   { get; set; }
    public Product Product     { get; set; } = null!;

    // Buyer identity — denormalized at write time
    public int     BuyerId     { get; set; }
    public string  BuyerName   { get; set; } = string.Empty;

    // Purchase proof — buyer supplies their OrderId at submission
    // Stored for admin audit; not hard-enforced at DB level (cross-service)
    public int?    OrderId     { get; set; }

    public int     Rating      { get; set; }   // 1–5
    public string  Title       { get; set; } = string.Empty;
    public string  Body        { get; set; } = string.Empty;

    // Seller response
    public string? SellerReply      { get; set; }
    public DateTime? SellerRepliedAt { get; set; }
    public int?    SellerRepliedById { get; set; }

    // Moderation
    public bool    IsVisible    { get; set; } = true;
    public string? ModeratorNote { get; set; }
}

// ── DTOs ──────────────────────────────────────────────────────────────────────

public record CreateReviewDto(
    int    Rating,      // 1–5
    string Title,
    string Body,
    int?   OrderId = null   // buyer's order ID as purchase proof
);

public record UpdateReviewDto(
    int?    Rating = null,
    string? Title  = null,
    string? Body   = null
);

public record SellerReplyDto(string Reply);

public record AdminModerateDto(bool IsVisible, string? Note = null);

public class ReviewSummaryDto
{
    public int     Id              { get; set; }
    public int     ProductId       { get; set; }
    public int     BuyerId         { get; set; }
    public string  BuyerName       { get; set; } = string.Empty;
    public int     Rating          { get; set; }
    public string  Title           { get; set; } = string.Empty;
    public string  Body            { get; set; } = string.Empty;
    public bool    IsVerifiedBuyer { get; set; }   // true if OrderId was provided
    public string? SellerReply     { get; set; }
    public DateTime? SellerRepliedAt { get; set; }
    public DateTime CreatedDate    { get; set; }
    public DateTime? UpdatedDate   { get; set; }
}

public class ProductRatingDto
{
    public decimal AverageRating  { get; set; }
    public int     TotalReviews   { get; set; }
    public Dictionary<int, int> Distribution { get; set; } = new(); // { 5: 40, 4: 30, ... }
}
