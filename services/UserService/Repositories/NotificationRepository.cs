// services/UserService/Repositories/NotificationRepository.cs
// NEW FILE

using Microsoft.EntityFrameworkCore;
using UserService.Data;
using UserService.Models;

namespace UserService.Repositories;

public interface INotificationRepository
{
    Task<NotificationPageDto> GetForUserAsync(int userId, int page, int pageSize, bool unreadOnly);
    Task<int> GetUnreadCountAsync(int userId);
    Task MarkReadAsync(int notificationId, int userId);
    Task MarkAllReadAsync(int userId);
    Task<Notification> CreateAsync(CreateNotificationCommand cmd);
    Task CreateBatchAsync(IEnumerable<CreateNotificationCommand> commands);
}

public class NotificationRepository(UserDbContext db) : INotificationRepository
{
    public async Task<NotificationPageDto> GetForUserAsync(
        int userId, int page, int pageSize, bool unreadOnly)
    {
        var query = db.Notifications
            .Where(n => n.UserId == userId);

        if (unreadOnly)
            query = query.Where(n => !n.IsRead);

        var total       = await query.CountAsync();
        var unreadCount = await db.Notifications
            .CountAsync(n => n.UserId == userId && !n.IsRead);

        var items = await query
            .OrderByDescending(n => n.CreatedDate)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return new NotificationPageDto
        {
            Items       = items.Select(MapToDto),
            Total       = total,
            UnreadCount = unreadCount
        };
    }

    public async Task<int> GetUnreadCountAsync(int userId) =>
        await db.Notifications.CountAsync(n => n.UserId == userId && !n.IsRead);

    public async Task MarkReadAsync(int notificationId, int userId)
    {
        var n = await db.Notifications
            .FirstOrDefaultAsync(x => x.Id == notificationId && x.UserId == userId);
        if (n is null || n.IsRead) return;

        n.IsRead = true;
        n.ReadAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
    }

    public async Task MarkAllReadAsync(int userId)
    {
        await db.Notifications
            .Where(n => n.UserId == userId && !n.IsRead)
            .ExecuteUpdateAsync(s => s
                .SetProperty(n => n.IsRead, true)
                .SetProperty(n => n.ReadAt, DateTime.UtcNow));
    }

    public async Task<Notification> CreateAsync(CreateNotificationCommand cmd)
    {
        var n = Map(cmd);
        db.Notifications.Add(n);
        await db.SaveChangesAsync();
        return n;
    }

    public async Task CreateBatchAsync(IEnumerable<CreateNotificationCommand> commands)
    {
        var notifications = commands.Select(Map).ToList();
        db.Notifications.AddRange(notifications);
        await db.SaveChangesAsync();
    }

    private static Notification Map(CreateNotificationCommand cmd) => new()
    {
        UserId      = cmd.UserId,
        Type        = cmd.Type,
        Title       = cmd.Title,
        Body        = cmd.Body,
        ActionUrl   = cmd.ActionUrl,
        EntityType  = cmd.EntityType,
        EntityId    = cmd.EntityId,
        CreatedDate = DateTime.UtcNow
    };

    private static NotificationDto MapToDto(Notification n) => new()
    {
        Id          = n.Id,
        Type        = n.Type.ToString(),
        Title       = n.Title,
        Body        = n.Body,
        ActionUrl   = n.ActionUrl,
        IsRead      = n.IsRead,
        CreatedDate = n.CreatedDate,
        TimeAgo     = GetTimeAgo(n.CreatedDate)
    };

    private static string GetTimeAgo(DateTime dt)
    {
        var diff = DateTime.UtcNow - dt;
        if (diff.TotalMinutes < 1)   return "just now";
        if (diff.TotalMinutes < 60)  return $"{(int)diff.TotalMinutes}m ago";
        if (diff.TotalHours   < 24)  return $"{(int)diff.TotalHours}h ago";
        if (diff.TotalDays    < 7)   return $"{(int)diff.TotalDays}d ago";
        return dt.ToString("dd MMM yyyy");
    }
}

// ── NotificationWriter ────────────────────────────────────────────────────────
// Convenience service with factory methods for every notification type.
// Injected by SellerVerificationRepository and other writers.
// Keeps notification creation logic in one place.

public class NotificationWriter(INotificationRepository repo)
{
    // ── Verification events ───────────────────────────────────────────────────

    public Task SellerSubmittedAsync(int sellerId) =>
        _writeToAdminsAsync(new CreateNotificationCommand(
            UserId:     0, // placeholder — replaced in _writeToAdminsAsync
            Type:       NotificationType.VerificationSubmitted,
            Title:      "New Seller Verification Request",
            Body:       "A seller has submitted a verification request and is awaiting review.",
            ActionUrl:  "/admin/verification",
            EntityType: "Verification"
        ));

    public Task SellerApprovedAsync(int sellerId) =>
        repo.CreateAsync(new CreateNotificationCommand(
            UserId:    sellerId,
            Type:      NotificationType.VerificationApproved,
            Title:     "🎉 Verification Approved!",
            Body:      "Your seller account has been approved. You can now list products on DevHub.",
            ActionUrl: "/products"
        ));

    public Task SellerRejectedAsync(int sellerId, string reason) =>
        repo.CreateAsync(new CreateNotificationCommand(
            UserId:    sellerId,
            Type:      NotificationType.VerificationRejected,
            Title:     "Verification Not Approved",
            Body:      $"Your verification was rejected. Reason: {reason}",
            ActionUrl: "/seller/verification"
        ));

    public Task SellerInfoRequestedAsync(int sellerId, string note) =>
        repo.CreateAsync(new CreateNotificationCommand(
            UserId:    sellerId,
            Type:      NotificationType.VerificationInfoRequested,
            Title:     "Additional Information Required",
            Body:      $"Admin needs more information: {note}",
            ActionUrl: "/seller/verification"
        ));

    // ── Order events ─────────────────────────────────────────────────────────

    public Task OrderPlacedBuyerAsync(int buyerId, int orderId) =>
        repo.CreateAsync(new CreateNotificationCommand(
            UserId:     buyerId,
            Type:       NotificationType.OrderPlaced,
            Title:      $"Order #{orderId} Confirmed",
            Body:       "Your order has been placed and is being processed by the seller(s).",
            ActionUrl:  "/shop/orders",
            EntityType: "Order",
            EntityId:   orderId
        ));

    public Task OrderPlacedSellerAsync(int sellerId, int orderId, string buyerName) =>
        repo.CreateAsync(new CreateNotificationCommand(
            UserId:     sellerId,
            Type:       NotificationType.NewOrder,
            Title:      $"New Order #{orderId}",
            Body:       $"{buyerName} placed an order with your store.",
            ActionUrl:  "/seller/shipments",
            EntityType: "Order",
            EntityId:   orderId
        ));

    public Task ShipmentShippedAsync(int buyerId, int orderId, string trackingNumber) =>
        repo.CreateAsync(new CreateNotificationCommand(
            UserId:     buyerId,
            Type:       NotificationType.OrderShipped,
            Title:      "Your Order Has Been Shipped",
            Body:       $"Tracking number: {trackingNumber}",
            ActionUrl:  "/shop/orders",
            EntityType: "Order",
            EntityId:   orderId
        ));

    public Task OrderDeliveredAsync(int buyerId, int orderId) =>
        repo.CreateAsync(new CreateNotificationCommand(
            UserId:     buyerId,
            Type:       NotificationType.OrderDelivered,
            Title:      "Order Delivered",
            Body:       "Your order has been delivered. We hope you enjoy your purchase!",
            ActionUrl:  "/shop/orders",
            EntityType: "Order",
            EntityId:   orderId
        ));

    // ── Review events ─────────────────────────────────────────────────────────

    public Task NewReviewSellerAsync(int sellerId, int productId, string productName, int rating) =>
        repo.CreateAsync(new CreateNotificationCommand(
            UserId:     sellerId,
            Type:       NotificationType.NewReview,
            Title:      $"New {rating}★ Review",
            Body:       $"A buyer left a review for \"{productName}\".",
            ActionUrl:  "/seller/reviews",
            EntityType: "Product",
            EntityId:   productId
        ));

    public Task SellerRepliedAsync(int buyerId, int productId, string productName) =>
        repo.CreateAsync(new CreateNotificationCommand(
            UserId:     buyerId,
            Type:       NotificationType.ReviewReplied,
            Title:      "Seller Replied to Your Review",
            Body:       $"The seller responded to your review of \"{productName}\".",
            ActionUrl:  $"/shop/product/{productId}",
            EntityType: "Product",
            EntityId:   productId
        ));

    // ── Admin broadcast ───────────────────────────────────────────────────────

    public async Task BroadcastAsync(int[] adminUserIds, string title, string body, string? actionUrl = null)
    {
        var commands = adminUserIds.Select(id => new CreateNotificationCommand(
            UserId:    id,
            Type:      NotificationType.SystemAnnouncement,
            Title:     title,
            Body:      body,
            ActionUrl: actionUrl
        ));
        await repo.CreateBatchAsync(commands);
    }

    // Write to all admin users — caller provides admin user IDs
    // (In a real system you'd have a GetAdminUserIds() query here)
    private async Task _writeToAdminsAsync(CreateNotificationCommand template)
    {
        // For now we just write to known admin IDs (id=1 from seed)
        // Phase 6+ can replace this with a real admin query
        await repo.CreateAsync(template with { UserId = 1 });
    }
}
