namespace CategoryService.Models;

public abstract class AuditableEntity
{
    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedDate { get; set; }
    public string CreatedBy { get; set; } = "system";
    public string? UpdatedBy { get; set; }
}

public class Category : AuditableEntity
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? ImageUrl { get; set; }
    public int? ParentId { get; set; }
    public Category? Parent { get; set; }
    public List<Category> Children { get; set; } = [];
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
}

public record CreateCategoryDto(
    string Name,
    string Slug,
    string? Description,
    string? ImageUrl,
    int? ParentId,
    int SortOrder = 0);

public record UpdateCategoryDto(
    string? Name,
    string? Description,
    string? ImageUrl,
    int? SortOrder,
    bool? IsActive);
