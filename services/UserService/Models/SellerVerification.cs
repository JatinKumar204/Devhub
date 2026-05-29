// services/UserService/Models/SellerVerification.cs
// New file — drop alongside the existing User.cs
//
// Four entities:
//   SellerProfile          — extended seller data (store name, phone, address, bank)
//   SellerVerification     — one active verification request per seller
//   VerificationDocument   — individual uploaded documents (CNIC front/back, business docs)
//   VerificationStatusHistory — immutable log of every status change + admin comments
//
// Design decisions:
//   - SellerProfile is 1:1 with User. Kept separate so the User table stays lean
//     and Buyer accounts are never touched by this schema.
//   - SellerVerification is also 1:1 with User. Only one active request exists at a time.
//     If a seller re-submits after rejection, the existing record is updated and a new
//     history entry is appended — full audit trail preserved.
//   - VerificationDocument rows are never deleted — they're marked Superseded when
//     a seller re-uploads during re-submission.
//   - All FKs reference UserId (int) to match the existing User.Id type.

namespace UserService.Models;

// ─── Enums ────────────────────────────────────────────────────────────────────

public enum VerificationStatus
{
    PendingApproval,    // just submitted, waiting for admin
    UnderReview,        // admin opened it
    Approved,           // seller can now list products
    Rejected,           // admin rejected with reason
    InfoRequested,      // admin asked for more documents
    Resubmitted         // seller updated and re-submitted after rejection/info request
}

public enum DocumentType
{
    CnicFront,          // required
    CnicBack,           // required
    BusinessRegistration,
    TaxCertificate,
    BankStatement,
    Other
}

public enum DocumentStatus
{
    Active,     // currently attached to the verification request
    Superseded  // replaced by a newer upload during re-submission
}

// ─── SellerProfile ────────────────────────────────────────────────────────────

/// <summary>
/// Extended profile data for Seller accounts. Created when a seller first registers.
/// 1:1 with User (UserId is both PK and FK).
/// </summary>
public class SellerProfile : AuditableEntity   // reuses existing AuditableEntity from User.cs
{
    public int UserId { get; set; }
    public User User { get; set; } = null!;

    // Store identity
    public string StoreName { get; set; } = string.Empty;
    public string? StoreDescription { get; set; }
    public string? StoreLogoUrl { get; set; }

    // Contact
    public string PhoneNumber { get; set; } = string.Empty;

    // Address
    public string AddressLine1 { get; set; } = string.Empty;
    public string? AddressLine2 { get; set; }
    public string City { get; set; } = string.Empty;
    public string Province { get; set; } = string.Empty;
    public string PostalCode { get; set; } = string.Empty;
    public string Country { get; set; } = "Pakistan";

    // Bank / payment details (stored as plain text for now; encrypt at rest in prod)
    public string? BankName { get; set; }
    public string? AccountTitle { get; set; }
    public string? AccountNumber { get; set; }
    public string? IbanNumber { get; set; }

    // Tax (optional)
    public string? NtnNumber { get; set; }       // National Tax Number
    public string? SalesTaxNumber { get; set; }

    // Navigation
    public SellerVerification? Verification { get; set; }
}

// ─── SellerVerification ───────────────────────────────────────────────────────

/// <summary>
/// One verification request per seller. Updated in-place when seller re-submits.
/// The StatusHistory table holds the full audit trail of every state transition.
/// </summary>
public class SellerVerification : AuditableEntity
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User User { get; set; } = null!;

    public VerificationStatus Status { get; set; } = VerificationStatus.PendingApproval;

    // Set when admin reviews
    public int? ReviewedByAdminId { get; set; }
    public DateTime? ReviewedAt { get; set; }

    // Submission tracking
    public int SubmissionCount { get; set; } = 1;   // increments on each re-submission
    public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastResubmittedAt { get; set; }

    // Navigation
    public SellerProfile SellerProfile { get; set; } = null!;
    public ICollection<VerificationDocument> Documents { get; set; } = new List<VerificationDocument>();
    public ICollection<VerificationStatusHistory> StatusHistory { get; set; } = new List<VerificationStatusHistory>();
}

// ─── VerificationDocument ─────────────────────────────────────────────────────

/// <summary>
/// Individual file uploaded as part of a verification request.
/// Never deleted — superseded when replaced.
/// </summary>
public class VerificationDocument : AuditableEntity
{
    public int Id { get; set; }
    public int VerificationId { get; set; }
    public SellerVerification Verification { get; set; } = null!;

    public DocumentType DocumentType { get; set; }
    public DocumentStatus Status { get; set; } = DocumentStatus.Active;

    // Storage path relative to wwwroot/uploads/verification/{userId}/
    public string FilePath { get; set; } = string.Empty;
    public string OriginalFileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long FileSizeBytes { get; set; }

    public string? Notes { get; set; }  // admin note about this specific document
}

// ─── VerificationStatusHistory ────────────────────────────────────────────────

/// <summary>
/// Immutable audit log. One row per status change.
/// Never updated or deleted — append only.
/// </summary>
public class VerificationStatusHistory
{
    public int Id { get; set; }
    public int VerificationId { get; set; }
    public SellerVerification Verification { get; set; } = null!;

    public VerificationStatus FromStatus { get; set; }
    public VerificationStatus ToStatus { get; set; }

    // Who triggered this change and when
    public int ChangedByUserId { get; set; }
    public string ChangedByName { get; set; } = string.Empty;
    public DateTime ChangedAt { get; set; } = DateTime.UtcNow;

    // Admin's comment (required on Rejected and InfoRequested, optional otherwise)
    public string? Comment { get; set; }
}

// ─── DTOs ─────────────────────────────────────────────────────────────────────

/// <summary>
/// Sent by Seller on initial registration alongside their User account.
/// Used in POST /api/auth/register when role = "Seller".
/// </summary>
public record SellerRegistrationDto(
    // Required
    string StoreName,
    string PhoneNumber,
    string AddressLine1,
    string City,
    string Province,
    string PostalCode,
    // Optional
    string? StoreDescription = null,
    string? AddressLine2 = null,
    string? Country = "Pakistan",
    string? BankName = null,
    string? AccountTitle = null,
    string? AccountNumber = null,
    string? IbanNumber = null,
    string? NtnNumber = null,
    string? SalesTaxNumber = null
);

/// <summary>
/// Sent by Seller when updating their profile and re-submitting for verification.
/// </summary>
public record SellerProfileUpdateDto(
    string? StoreName,
    string? PhoneNumber,
    string? StoreDescription,
    string? AddressLine1,
    string? AddressLine2,
    string? City,
    string? Province,
    string? PostalCode,
    string? Country,
    string? BankName,
    string? AccountTitle,
    string? AccountNumber,
    string? IbanNumber,
    string? NtnNumber,
    string? SalesTaxNumber
);

/// <summary>
/// Admin decision — approve, reject, or request more information.
/// </summary>
public record AdminReviewDto(
    VerificationStatus Decision,    // must be Approved, Rejected, or InfoRequested
    string? Comment                 // required when Decision is Rejected or InfoRequested
);

/// <summary>
/// What the API returns when a seller or admin views the verification record.
/// Flattens the SellerVerification + SellerProfile + latest documents into one object.
/// </summary>
public class VerificationSummaryDto
{
    public int VerificationId { get; set; }
    public int UserId { get; set; }
    public string SellerName { get; set; } = string.Empty;
    public string SellerEmail { get; set; } = string.Empty;
    public string StoreName { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string Province { get; set; } = string.Empty;
    public VerificationStatus Status { get; set; }
    public string StatusLabel => Status.ToString();
    public int SubmissionCount { get; set; }
    public DateTime SubmittedAt { get; set; }
    public DateTime? LastResubmittedAt { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public List<DocumentSummaryDto> Documents { get; set; } = new();
    public List<HistoryEntryDto> History { get; set; } = new();
}

public class DocumentSummaryDto
{
    public int Id { get; set; }
    public string DocumentType { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string FilePath { get; set; } = string.Empty;
    public string OriginalFileName { get; set; } = string.Empty;
    public long FileSizeBytes { get; set; }
    public DateTime UploadedAt { get; set; }
    public string? Notes { get; set; }
}

public class HistoryEntryDto
{
    public string FromStatus { get; set; } = string.Empty;
    public string ToStatus { get; set; } = string.Empty;
    public string ChangedBy { get; set; } = string.Empty;
    public DateTime ChangedAt { get; set; }
    public string? Comment { get; set; }
}
