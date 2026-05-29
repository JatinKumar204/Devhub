// services/UserService/Models/RefreshToken.cs
// NEW FILE
//
// Design decisions:
//   - One active refresh token per user at a time (rotated on every use)
//   - Token is a cryptographically random 64-byte hex string
//   - Expires in 7 days by default (configurable via appsettings)
//   - When a token is used, it is immediately marked IsUsed=true
//     and a new token is issued — this is token rotation
//   - If a used token is presented again, it means token theft:
//     all tokens for that user are revoked immediately
//   - Tokens are never deleted — kept for audit trail
//     (a background job can clean up tokens older than 30 days)

namespace UserService.Models;

public class RefreshToken
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User User { get; set; } = null!;

    public string Token { get; set; } = string.Empty;   // 64-byte hex
    public DateTime ExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string CreatedByIp { get; set; } = string.Empty;

    // Set when the token is used to issue a new pair
    public bool IsUsed { get; set; } = false;
    public DateTime? UsedAt { get; set; }

    // Set when revoked (logout, theft detection, admin action)
    public bool IsRevoked { get; set; } = false;
    public DateTime? RevokedAt { get; set; }
    public string? RevokedReason { get; set; }

    public bool IsActive => !IsUsed && !IsRevoked && DateTime.UtcNow < ExpiresAt;
}
