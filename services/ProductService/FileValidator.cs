// Shared/FileValidator.cs
// Drop this file into any service that accepts file uploads.
// Validates file content against magic bytes — prevents disguised files
// by checking actual file content, not just the Content-Type header.
//
// Usage:
//   var result = await FileValidator.ValidateAsync(file);
//   if (!result.IsValid) return BadRequest(new { message = result.Error });

public static class FileValidator
{
    private static readonly Dictionary<string, byte[][]> MagicBytes = new()
    {
        ["image/jpeg"]      = [[ 0xFF, 0xD8, 0xFF ]],
        ["image/png"]       = [[ 0x89, 0x50, 0x4E, 0x47 ]],
        ["image/webp"]      = [[ 0x52, 0x49, 0x46, 0x46 ]],   // RIFF....WEBP
        ["image/gif"]       = [[ 0x47, 0x49, 0x46, 0x38 ]],   // GIF8
        ["application/pdf"] = [[ 0x25, 0x50, 0x44, 0x46 ]],   // %PDF
    };

    private static readonly HashSet<string> AllowedImageTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "image/jpeg", "image/png", "image/webp", "image/gif"
    };

    private static readonly HashSet<string> AllowedDocTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "image/jpeg", "image/png", "application/pdf"
    };

    public static async Task<ValidationResult> ValidateImageAsync(IFormFile file, long maxBytes = 5 * 1024 * 1024)
        => await ValidateAsync(file, AllowedImageTypes, maxBytes);

    public static async Task<ValidationResult> ValidateDocumentAsync(IFormFile file, long maxBytes = 5 * 1024 * 1024)
        => await ValidateAsync(file, AllowedDocTypes, maxBytes);

    public static async Task<ValidationResult> ValidateAsync(
        IFormFile file,
        IReadOnlySet<string> allowedTypes,
        long maxBytes = 5 * 1024 * 1024)
    {
        if (file is null || file.Length == 0)
            return ValidationResult.Fail("No file provided.");

        if (file.Length > maxBytes)
            return ValidationResult.Fail($"File exceeds maximum size of {maxBytes / 1024 / 1024}MB.");

        var contentType = file.ContentType?.ToLowerInvariant() ?? string.Empty;
        if (!allowedTypes.Contains(contentType))
            return ValidationResult.Fail($"File type '{contentType}' is not allowed.");

        // Verify magic bytes — do NOT trust Content-Type alone
        if (!MagicBytes.TryGetValue(contentType, out var signatures))
            return ValidationResult.Fail("Cannot verify file integrity for this type.");

        var buffer = new byte[8];
        await using var stream = file.OpenReadStream();
        var bytesRead = await stream.ReadAsync(buffer.AsMemory(0, 8));

        if (bytesRead < 4)
            return ValidationResult.Fail("File is too small to be valid.");

        // WebP: RIFF header + "WEBP" at bytes 8-11
        if (contentType == "image/webp")
        {
            if (bytesRead >= 4 && buffer[0] == 0x52 && buffer[1] == 0x49 &&
                buffer[2] == 0x46 && buffer[3] == 0x46)
                return ValidationResult.Ok();
            return ValidationResult.Fail("File content does not match declared type.");
        }

        var isValid = signatures.Any(sig =>
            sig.Length <= bytesRead &&
            sig.Select((b, i) => buffer[i] == b).All(x => x));

        return isValid
            ? ValidationResult.Ok()
            : ValidationResult.Fail("File content does not match declared type.");
    }
}

public class ValidationResult
{
    public bool   IsValid { get; private init; }
    public string Error   { get; private init; } = string.Empty;

    public static ValidationResult Ok()            => new() { IsValid = true };
    public static ValidationResult Fail(string msg) => new() { IsValid = false, Error = msg };
}
