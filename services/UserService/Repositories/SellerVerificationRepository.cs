// services/UserService/Repositories/SellerVerificationRepository.cs
// CHANGES from Phase 1 version:
//   - Injects NotificationWriter
//   - CreateAsync: writes VerificationSubmitted notification to admin
//   - ReviewAsync: writes Approved / Rejected / InfoRequested notification to seller
//   - ResubmitAsync: writes VerificationResubmitted notification to admin
//   Everything else UNCHANGED

using Microsoft.EntityFrameworkCore;
using UserService.Data;
using UserService.Models;

namespace UserService.Repositories;

public interface ISellerVerificationRepository
{
    Task<SellerVerification?> GetByUserIdAsync(int userId);
    Task<SellerVerification> CreateAsync(int userId, SellerRegistrationDto dto, string createdBy);
    Task<SellerVerification?> ResubmitAsync(int userId, SellerProfileUpdateDto dto, string updatedBy);
    Task<VerificationDocument> AddDocumentAsync(int verificationId, VerificationDocument doc, string createdBy);
    Task SupersedeDocumentsAsync(int verificationId, DocumentType docType, string updatedBy);
    Task<(IEnumerable<VerificationSummaryDto> Items, int Total)> GetPendingAsync(int page, int pageSize, VerificationStatus? statusFilter);
    Task<VerificationSummaryDto?> GetSummaryAsync(int verificationId);
    Task<SellerVerification?> ReviewAsync(int verificationId, int adminId, string adminName, AdminReviewDto dto);
    Task<bool> IsApprovedAsync(int userId);
}

public class SellerVerificationRepository(
    UserDbContext db,
    NotificationWriter notifications) : ISellerVerificationRepository
{
    public async Task<SellerVerification?> GetByUserIdAsync(int userId) =>
        await db.SellerVerifications
            .Include(sv => sv.SellerProfile)
            .Include(sv => sv.Documents.Where(d => d.Status == DocumentStatus.Active))
            .Include(sv => sv.StatusHistory.OrderByDescending(h => h.ChangedAt))
            .FirstOrDefaultAsync(sv => sv.UserId == userId);

    public async Task<SellerVerification> CreateAsync(
        int userId, SellerRegistrationDto dto, string createdBy)
    {
        var profile = new SellerProfile
        {
            UserId = userId,
            StoreName = dto.StoreName,
            StoreDescription = dto.StoreDescription,
            PhoneNumber = dto.PhoneNumber,
            AddressLine1 = dto.AddressLine1,
            AddressLine2 = dto.AddressLine2,
            City = dto.City,
            Province = dto.Province,
            PostalCode = dto.PostalCode,
            Country = dto.Country ?? "Pakistan",
            BankName = dto.BankName,
            AccountTitle = dto.AccountTitle,
            AccountNumber = dto.AccountNumber,
            IbanNumber = dto.IbanNumber,
            NtnNumber = dto.NtnNumber,
            SalesTaxNumber = dto.SalesTaxNumber,
            CreatedBy = createdBy,
            CreatedDate = DateTime.UtcNow
        };
        db.SellerProfiles.Add(profile);

        var verification = new SellerVerification
        {
            UserId = userId,
            Status = VerificationStatus.PendingApproval,
            SubmissionCount = 1,
            SubmittedAt = DateTime.UtcNow,
            CreatedBy = createdBy,
            CreatedDate = DateTime.UtcNow
        };
        db.SellerVerifications.Add(verification);
        await db.SaveChangesAsync();

        db.VerificationStatusHistories.Add(new VerificationStatusHistory
        {
            VerificationId = verification.Id,
            FromStatus = VerificationStatus.PendingApproval,
            ToStatus = VerificationStatus.PendingApproval,
            ChangedByUserId = userId,
            ChangedByName = createdBy,
            ChangedAt = DateTime.UtcNow,
            Comment = "Verification request submitted"
        });
        await db.SaveChangesAsync();

        // CHANGED: notify admin
        await notifications.SellerSubmittedAsync(userId);

        return verification;
    }

    public async Task<SellerVerification?> ResubmitAsync(
        int userId, SellerProfileUpdateDto dto, string updatedBy)
    {
        var verification = await db.SellerVerifications
            .Include(sv => sv.SellerProfile)
            .FirstOrDefaultAsync(sv => sv.UserId == userId);

        if (verification is null) return null;
        if (verification.Status != VerificationStatus.Rejected &&
            verification.Status != VerificationStatus.InfoRequested)
            return null;

        var previousStatus = verification.Status;
        var profile = verification.SellerProfile;

        if (dto.StoreName is not null) profile.StoreName = dto.StoreName;
        if (dto.PhoneNumber is not null) profile.PhoneNumber = dto.PhoneNumber;
        if (dto.StoreDescription is not null) profile.StoreDescription = dto.StoreDescription;
        if (dto.AddressLine1 is not null) profile.AddressLine1 = dto.AddressLine1;
        if (dto.AddressLine2 is not null) profile.AddressLine2 = dto.AddressLine2;
        if (dto.City is not null) profile.City = dto.City;
        if (dto.Province is not null) profile.Province = dto.Province;
        if (dto.PostalCode is not null) profile.PostalCode = dto.PostalCode;
        if (dto.Country is not null) profile.Country = dto.Country;
        if (dto.BankName is not null) profile.BankName = dto.BankName;
        if (dto.AccountTitle is not null) profile.AccountTitle = dto.AccountTitle;
        if (dto.AccountNumber is not null) profile.AccountNumber = dto.AccountNumber;
        if (dto.IbanNumber is not null) profile.IbanNumber = dto.IbanNumber;
        if (dto.NtnNumber is not null) profile.NtnNumber = dto.NtnNumber;
        if (dto.SalesTaxNumber is not null) profile.SalesTaxNumber = dto.SalesTaxNumber;
        profile.UpdatedDate = DateTime.UtcNow;
        profile.UpdatedBy = updatedBy;

        verification.Status = VerificationStatus.Resubmitted;
        verification.SubmissionCount += 1;
        verification.LastResubmittedAt = DateTime.UtcNow;
        verification.UpdatedDate = DateTime.UtcNow;
        verification.UpdatedBy = updatedBy;

        db.VerificationStatusHistories.Add(new VerificationStatusHistory
        {
            VerificationId = verification.Id,
            FromStatus = previousStatus,
            ToStatus = VerificationStatus.Resubmitted,
            ChangedByUserId = userId,
            ChangedByName = updatedBy,
            ChangedAt = DateTime.UtcNow,
            Comment = "Seller re-submitted verification request"
        });
        await db.SaveChangesAsync();

        // CHANGED: notify admin of re-submission
        await notifications.SellerSubmittedAsync(userId);

        return verification;
    }

    public async Task<VerificationDocument> AddDocumentAsync(
        int verificationId, VerificationDocument doc, string createdBy)
    {
        doc.VerificationId = verificationId;
        doc.Status = DocumentStatus.Active;
        doc.CreatedBy = createdBy;
        doc.CreatedDate = DateTime.UtcNow;
        db.VerificationDocuments.Add(doc);
        await db.SaveChangesAsync();
        return doc;
    }

    public async Task SupersedeDocumentsAsync(
        int verificationId, DocumentType docType, string updatedBy)
    {
        var existing = await db.VerificationDocuments
            .Where(d => d.VerificationId == verificationId &&
                        d.DocumentType == docType &&
                        d.Status == DocumentStatus.Active)
            .ToListAsync();

        foreach (var doc in existing)
        {
            doc.Status = DocumentStatus.Superseded;
            doc.UpdatedDate = DateTime.UtcNow;
            doc.UpdatedBy = updatedBy;
        }
        await db.SaveChangesAsync();
    }

    public async Task<(IEnumerable<VerificationSummaryDto> Items, int Total)> GetPendingAsync(
        int page, int pageSize, VerificationStatus? statusFilter)
    {
        var query = db.SellerVerifications
            .Include(sv => sv.User)
            .Include(sv => sv.SellerProfile)
            .Include(sv => sv.Documents.Where(d => d.Status == DocumentStatus.Active))
            .AsQueryable();

        if (statusFilter.HasValue)
            query = query.Where(sv => sv.Status == statusFilter.Value);
        else
            query = query.Where(sv =>
                sv.Status == VerificationStatus.PendingApproval ||
                sv.Status == VerificationStatus.Resubmitted ||
                sv.Status == VerificationStatus.UnderReview);

        var total = await query.CountAsync();
        var items = await query
            .OrderBy(sv => sv.SubmittedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return (items.Select(x => MapToSummary(x)), total);
    }

    public async Task<VerificationSummaryDto?> GetSummaryAsync(int verificationId)
    {
        var sv = await db.SellerVerifications
            .Include(sv => sv.User)
            .Include(sv => sv.SellerProfile)
            .Include(sv => sv.Documents)
            .Include(sv => sv.StatusHistory.OrderByDescending(h => h.ChangedAt))
            .FirstOrDefaultAsync(sv => sv.Id == verificationId);

        return sv is null ? null : MapToSummary(sv, includeAllDocs: true);
    }

    public async Task<SellerVerification?> ReviewAsync(
        int verificationId, int adminId, string adminName, AdminReviewDto dto)
    {
        var allowed = new[]
        {
            VerificationStatus.Approved,
            VerificationStatus.Rejected,
            VerificationStatus.InfoRequested
        };
        if (!allowed.Contains(dto.Decision)) return null;
        if (dto.Decision is VerificationStatus.Rejected or VerificationStatus.InfoRequested
            && string.IsNullOrWhiteSpace(dto.Comment))
            return null;

        var verification = await db.SellerVerifications
            .FirstOrDefaultAsync(sv => sv.Id == verificationId);
        if (verification is null) return null;

        var previousStatus = verification.Status;

        verification.Status = dto.Decision;
        verification.ReviewedByAdminId = adminId;
        verification.ReviewedAt = DateTime.UtcNow;
        verification.UpdatedDate = DateTime.UtcNow;
        verification.UpdatedBy = adminName;

        db.VerificationStatusHistories.Add(new VerificationStatusHistory
        {
            VerificationId = verificationId,
            FromStatus = previousStatus,
            ToStatus = dto.Decision,
            ChangedByUserId = adminId,
            ChangedByName = adminName,
            ChangedAt = DateTime.UtcNow,
            Comment = dto.Comment
        });
        await db.SaveChangesAsync();

        // CHANGED: notify seller of the decision
        switch (dto.Decision)
        {
            case VerificationStatus.Approved:
                await notifications.SellerApprovedAsync(verification.UserId);
                break;
            case VerificationStatus.Rejected:
                await notifications.SellerRejectedAsync(
                    verification.UserId, dto.Comment ?? "No reason provided");
                break;
            case VerificationStatus.InfoRequested:
                await notifications.SellerInfoRequestedAsync(
                    verification.UserId, dto.Comment ?? "Please provide additional documents");
                break;
        }

        return verification;
    }

    public async Task<bool> IsApprovedAsync(int userId) =>
        await db.SellerVerifications
            .AnyAsync(sv => sv.UserId == userId &&
                            sv.Status == VerificationStatus.Approved);

    // ── Mapping helpers (UNCHANGED) ───────────────────────────────────────────

    private static VerificationSummaryDto MapToSummary(
        SellerVerification sv, bool includeAllDocs = false)
    {
        var docs = includeAllDocs
            ? sv.Documents
            : sv.Documents.Where(d => d.Status == DocumentStatus.Active);

        return new VerificationSummaryDto
        {
            VerificationId = sv.Id,
            UserId = sv.UserId,
            SellerName = sv.User?.Name ?? string.Empty,
            SellerEmail = sv.User?.Email ?? string.Empty,
            StoreName = sv.SellerProfile?.StoreName ?? string.Empty,
            PhoneNumber = sv.SellerProfile?.PhoneNumber ?? string.Empty,
            City = sv.SellerProfile?.City ?? string.Empty,
            Province = sv.SellerProfile?.Province ?? string.Empty,
            Status = sv.Status,
            SubmissionCount = sv.SubmissionCount,
            SubmittedAt = sv.SubmittedAt,
            LastResubmittedAt = sv.LastResubmittedAt,
            ReviewedAt = sv.ReviewedAt,
            Documents = docs.Select(d => new DocumentSummaryDto
            {
                Id = d.Id,
                DocumentType = d.DocumentType.ToString(),
                Status = d.Status.ToString(),
                FilePath = d.FilePath,
                OriginalFileName = d.OriginalFileName,
                FileSizeBytes = d.FileSizeBytes,
                UploadedAt = d.CreatedDate,
                Notes = d.Notes
            }).ToList(),
            History = sv.StatusHistory?.Select(h => new HistoryEntryDto
            {
                FromStatus = h.FromStatus.ToString(),
                ToStatus = h.ToStatus.ToString(),
                ChangedBy = h.ChangedByName,
                ChangedAt = h.ChangedAt,
                Comment = h.Comment
            }).ToList() ?? new()
        };
    }
}
