// services/UserService/Models/Notification.cs
// NEW FILE
//
// Design:
//   - In-app notification table, polled by Angular every 30 seconds
//   - Written by any service that needs to notify a user
//   - NotificationType enum covers all current event types across phases
//   - No push/email for now — infrastructure is ready to add it
//   - Notifications are soft-deleted (IsRead flag), never hard-deleted
//   - Unread count is a cheap COUNT query on IsRead=false per userId

namespace UserService.Models;

public enum NotificationType
{
    // Seller verification events
    VerificationSubmitted,
    VerificationApproved,
    VerificationRejected,
    VerificationInfoRequested,
    VerificationResubmitted,

    // Order events (buyer)
    OrderPlaced,
    OrderShipped,
    OrderDelivered,
    OrderCancelled,

    // Shipment events (seller)
    NewOrder,           // seller receives a new order

    // Review events (seller)
    NewReview,          // seller receives a new review
    ReviewReplied,      // buyer: seller replied to their review

    // System
    SystemAnnouncement
}

public class Notification
{
    public int              Id           { get; set; }
    public int              UserId       { get; set; }   // recipient
    public NotificationType Type         { get; set; }
    public string           Title        { get; set; } = string.Empty;
    public string           Body         { get; set; } = string.Empty;
    public string?          ActionUrl    { get; set; }   // e.g. "/seller/verification"
    public string?          EntityType   { get; set; }   // "Order", "Review", "Verification"
    public int?             EntityId     { get; set; }   // the related entity's Id
    public bool             IsRead       { get; set; } = false;
    public DateTime         CreatedDate  { get; set; } = DateTime.UtcNow;
    public DateTime?        ReadAt       { get; set; }
}

// ── DTOs ──────────────────────────────────────────────────────────────────────

public class NotificationDto
{
    public int    Id          { get; set; }
    public string Type        { get; set; } = string.Empty;
    public string Title       { get; set; } = string.Empty;
    public string Body        { get; set; } = string.Empty;
    public string? ActionUrl  { get; set; }
    public bool   IsRead      { get; set; }
    public DateTime CreatedDate { get; set; }
    public string  TimeAgo    { get; set; } = string.Empty;  // "2 hours ago"
}

public class NotificationPageDto
{
    public IEnumerable<NotificationDto> Items      { get; set; } = [];
    public int                          Total      { get; set; }
    public int                          UnreadCount { get; set; }
}

// Internal: used by services to write notifications
// Not exposed as an HTTP endpoint — called directly by repository
public record CreateNotificationCommand(
    int              UserId,
    NotificationType Type,
    string           Title,
    string           Body,
    string?          ActionUrl  = null,
    string?          EntityType = null,
    int?             EntityId   = null
);
