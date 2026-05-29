// services/UserService/Models/User.cs
// Changes from previous version:
//   - TokenResponse gets nullable VerificationStatus string field
//   - RegisterDto replaced by FullRegisterDto (defined in AuthController.cs)
//   - Everything else UNCHANGED

namespace UserService.Models;

public abstract class AuditableEntity
{
    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedDate { get; set; }
    public string CreatedBy { get; set; } = "system";
    public string? UpdatedBy { get; set; }
}

public class User : AuditableEntity
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string Role { get; set; } = "Buyer";   // "Admin" | "Seller" | "Buyer"
    public string Department { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime? LastLoginAt { get; set; }
}

// Admin-only create
public record CreateUserDto(string Name, string Email, string Password, string Role = "Buyer", string Department = "");
public record UpdateUserDto(string? Name, string? Email, string? Role, bool? IsActive, string? Department);
public record LoginDto(string Email, string Password);

public class UserStats
{
    public int Total { get; set; }
    public int Active { get; set; }
    public int Inactive { get; set; }
    public Dictionary<string, int> ByDepartment { get; set; } = new();
    public Dictionary<string, int> ByRole { get; set; } = new();
}

public class TokenResponse
{
    public string AccessToken { get; set; } = string.Empty;
    public string TokenType { get; set; } = "Bearer";
    public int ExpiresInSeconds { get; set; }
    public int UserId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    // NEW: null for Buyers/Admins, "PendingApproval"/"Approved"/etc. for Sellers
    public string? VerificationStatus { get; set; }
}
