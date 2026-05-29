// services/UserService/Controllers/SellerVerificationController.cs
// New file — follows the same controller pattern as UsersController.cs
//
// Routes:
//   Seller:
//     GET    /api/seller-verification/my-status        — view own verification status
//     PUT    /api/seller-verification/resubmit         — re-submit after rejection
//     POST   /api/seller-verification/documents        — upload a document
//
//   Admin:
//     GET    /api/seller-verification/queue            — list pending/resubmitted verifications
//     GET    /api/seller-verification/{id}             — full detail for one verification
//     PUT    /api/seller-verification/{id}/review      — approve / reject / request info

using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UserService.Models;
using UserService.Repositories;

namespace UserService.Controllers;

[ApiController]
[Route("api/seller-verification")]
[Produces("application/json")]
public class SellerVerificationController(
    ISellerVerificationRepository repo,
    IWebHostEnvironment env,
    ILogger<SellerVerificationController> logger) : ControllerBase
{
    private int CallerId =>
        int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : 0;

    private string CallerName =>
        User.FindFirstValue(ClaimTypes.Name) ?? "unknown";

    // ── Seller endpoints ──────────────────────────────────────────────────────

    /// <summary>
    /// Seller views their own verification status and history.
    /// </summary>
    [HttpGet("my-status")]
    [Authorize(Roles = "Seller")]
    public async Task<IActionResult> GetMyStatus()
    {
        var verification = await repo.GetByUserIdAsync(CallerId);
        if (verification is null)
            return NotFound(new { message = "No verification request found. Please complete your profile." });

        return Ok(new
        {
            status         = verification.Status.ToString(),
            submissionCount = verification.SubmissionCount,
            submittedAt    = verification.SubmittedAt,
            reviewedAt     = verification.ReviewedAt,
            storeName      = verification.SellerProfile?.StoreName,
            documents      = verification.Documents
                .Where(d => d.Status == DocumentStatus.Active)
                .Select(d => new
                {
                    id           = d.Id,
                    documentType = d.DocumentType.ToString(),
                    fileName     = d.OriginalFileName,
                    uploadedAt   = d.CreatedDate
                }),
            history = verification.StatusHistory
                .OrderByDescending(h => h.ChangedAt)
                .Select(h => new
                {
                    from      = h.FromStatus.ToString(),
                    to        = h.ToStatus.ToString(),
                    changedAt = h.ChangedAt,
                    comment   = h.Comment
                })
        });
    }

    /// <summary>
    /// Seller re-submits after rejection or info request.
    /// Updates profile fields and moves status back to Resubmitted.
    /// </summary>
    [HttpPut("resubmit")]
    [Authorize(Roles = "Seller")]
    public async Task<IActionResult> Resubmit([FromBody] SellerProfileUpdateDto dto)
    {
        var result = await repo.ResubmitAsync(CallerId, dto, CallerName);

        if (result is null)
            return BadRequest(new
            {
                message = "Re-submission is only allowed when your verification is Rejected or Info Requested."
            });

        logger.LogInformation("Seller {Id} re-submitted verification", CallerId);
        return Ok(new { message = "Re-submitted successfully. Admin will review your request.", status = result.Status.ToString() });
    }

    /// <summary>
    /// Upload a verification document (CNIC front/back, business registration, etc.)
    /// Accepts: image/jpeg, image/png, application/pdf
    /// Max size: 5MB
    /// </summary>
    [HttpPost("documents")]
    [Authorize(Roles = "Seller")]
    [Microsoft.AspNetCore.RateLimiting.EnableRateLimiting("upload")]
    public async Task<IActionResult> UploadDocument(
        [FromForm] IFormFile file,
        [FromForm] string documentType)
    {
        // Validate document type
        if (!Enum.TryParse<DocumentType>(documentType, ignoreCase: true, out var docType))
            return BadRequest(new { message = $"Invalid document type. Valid values: {string.Join(", ", Enum.GetNames<DocumentType>())}" });

        var validation = await FileValidator.ValidateDocumentAsync(file);
        if (!validation.IsValid)
            return BadRequest(new { message = validation.Error });

        // Validate file
        if (file is null || file.Length == 0)
            return BadRequest(new { message = "No file provided." });

        const long maxBytes = 5 * 1024 * 1024; // 5MB
        if (file.Length > maxBytes)
            return BadRequest(new { message = "File size must not exceed 5MB." });

        var allowed = new[] { "image/jpeg", "image/png", "application/pdf" };
        if (!allowed.Contains(file.ContentType.ToLower()))
            return BadRequest(new { message = "Only JPEG, PNG, and PDF files are accepted." });

        // Magic byte validation (don't trust ContentType alone)
        if (!await IsValidFileAsync(file))
            return BadRequest(new { message = "File content does not match declared type." });

        // Fetch the verification record
        var verification = await repo.GetByUserIdAsync(CallerId);
        if (verification is null)
            return NotFound(new { message = "Submit your seller profile first before uploading documents." });

        // Supersede existing document of the same type (re-upload replaces old one)
        await repo.SupersedeDocumentsAsync(verification.Id, docType, CallerName);

        // Save the file to wwwroot/uploads/verification/{userId}/
        var uploadDir = Path.Combine(env.ContentRootPath, "uploads", "verification", CallerId.ToString());
        Directory.CreateDirectory(uploadDir);

        var ext      = Path.GetExtension(file.FileName);
        var safeName = $"{docType}_{DateTime.UtcNow:yyyyMMddHHmmss}{ext}";
        var fullPath = Path.Combine(uploadDir, safeName);

        await using var stream = new FileStream(fullPath, FileMode.Create);
        await file.CopyToAsync(stream);

        var relativePath = $"/uploads/verification/{CallerId}/{safeName}";

        var doc = new VerificationDocument
        {
            DocumentType     = docType,
            FilePath         = relativePath,
            OriginalFileName = file.FileName,
            ContentType      = file.ContentType,
            FileSizeBytes    = file.Length,
        };

        var saved = await repo.AddDocumentAsync(verification.Id, doc, CallerName);

        logger.LogInformation("Seller {Id} uploaded {DocType} document (#{DocId})", CallerId, docType, saved.Id);

        return Ok(new
        {
            id           = saved.Id,
            documentType = saved.DocumentType.ToString(),
            fileName     = saved.OriginalFileName,
            filePath     = saved.FilePath,
            uploadedAt   = saved.CreatedDate
        });
    }

    // ── Admin endpoints ───────────────────────────────────────────────────────

    /// <summary>
    /// Admin views the review queue — pending, resubmitted, or any status.
    /// </summary>
    [HttpGet("queue")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetQueue(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? status = null)
    {
        VerificationStatus? statusFilter = null;
        if (status is not null && Enum.TryParse<VerificationStatus>(status, ignoreCase: true, out var parsed))
            statusFilter = parsed;

        var (items, total) = await repo.GetPendingAsync(page, pageSize, statusFilter);

        return Ok(new
        {
            items,
            total,
            page,
            pageSize,
            totalPages = (int)Math.Ceiling(total / (double)pageSize)
        });
    }

    /// <summary>
    /// Admin gets the full detail for one verification — all docs, full history.
    /// </summary>
    [HttpGet("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetById(int id)
    {
        var summary = await repo.GetSummaryAsync(id);
        if (summary is null)
            return NotFound(new { message = $"Verification {id} not found." });

        return Ok(summary);
    }

    /// <summary>
    /// Admin approves, rejects, or requests more information.
    /// Comment is required for Rejected and InfoRequested decisions.
    /// </summary>
    [HttpPut("{id:int}/review")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Review(int id, [FromBody] AdminReviewDto dto)
    {
        var allowed = new[] { VerificationStatus.Approved, VerificationStatus.Rejected, VerificationStatus.InfoRequested };
        if (!allowed.Contains(dto.Decision))
            return BadRequest(new { message = "Decision must be Approved, Rejected, or InfoRequested." });

        if (dto.Decision is VerificationStatus.Rejected or VerificationStatus.InfoRequested
            && string.IsNullOrWhiteSpace(dto.Comment))
            return BadRequest(new { message = "A comment is required when rejecting or requesting more information." });

        var result = await repo.ReviewAsync(id, CallerId, CallerName, dto);
        if (result is null)
            return NotFound(new { message = $"Verification {id} not found." });

        logger.LogInformation(
            "Admin {AdminId} reviewed verification {VerId}: {Decision}",
            CallerId, id, dto.Decision);

        return Ok(new
        {
            message  = $"Seller verification {dto.Decision} successfully.",
            status   = result.Status.ToString(),
            reviewedAt = result.ReviewedAt
        });
    }

    // ── File validation ───────────────────────────────────────────────────────

    private static async Task<bool> IsValidFileAsync(IFormFile file)
    {
        var buffer = new byte[8];
        await using var stream = file.OpenReadStream();
        var read = await stream.ReadAsync(buffer.AsMemory(0, 8));
        if (read < 4) return false;

        return file.ContentType.ToLower() switch
        {
            "image/jpeg"      => buffer[0] == 0xFF && buffer[1] == 0xD8,
            "image/png"       => buffer[0] == 0x89 && buffer[1] == 0x50 && buffer[2] == 0x4E && buffer[3] == 0x47,
            "application/pdf" => buffer[0] == 0x25 && buffer[1] == 0x50 && buffer[2] == 0x44 && buffer[3] == 0x46,
            _                 => false
        };
    }
}
