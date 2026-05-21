// Controllers/ProductsController.cs
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProductService.Models;
using ProductService.Repositories;
using System.Security.Claims;

namespace ProductService.Controllers;

[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public class ProductsController(
    IProductRepository repo,
    ILogger<ProductsController> logger,
    IWebHostEnvironment env) : ControllerBase
{
    private int CallerId => int.TryParse(
        User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : 0;

    private bool IsAdmin => User.IsInRole("Admin");

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? search = null,
        [FromQuery] string? category = null,
        [FromQuery] bool? isActive = null,
        [FromQuery] bool? isFeatured = null,
        [FromQuery] decimal? minPrice = null,
        [FromQuery] decimal? maxPrice = null,
        [FromQuery] string? sortBy = null,
        [FromQuery] string? brand = null,
        [FromQuery] int? sellerId = null)
    {
        var (items, total) = await repo.GetAllAsync(
            page, pageSize, search, category, isActive, isFeatured,
            minPrice, maxPrice, sortBy, brand, sellerId);

        return Ok(new
        {
            items,
            total,
            page,
            pageSize,
            totalPages = (int)Math.Ceiling(total / (double)pageSize)
        });
    }

    [HttpGet("featured")]
    public async Task<IActionResult> GetFeatured([FromQuery] int count = 8) =>
        Ok(await repo.GetFeaturedAsync(count));

    [HttpGet("categories")]
    public async Task<IActionResult> GetCategories() =>
        Ok(await repo.GetCategoriesAsync());

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var product = await repo.GetByIdAsync(id);
        return product is null ? NotFound(new { message = $"Product {id} not found" }) : Ok(product);
    }

    [HttpGet("{id:int}/related")]
    public async Task<IActionResult> GetRelated(int id, [FromQuery] int count = 6) =>
        Ok(await repo.GetRelatedAsync(id, count));

    [HttpGet("my-products")]
    [Authorize(Roles = "Admin,Seller")]
    public async Task<IActionResult> GetMyProducts([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var sellerIdFilter = IsAdmin ? (int?)null : CallerId;
        var (items, total) = await repo.GetAllAsync(page, pageSize, null, null, null, null, null, null, null, null, sellerIdFilter);
        return Ok(new
        {
            items,
            total,
            page,
            pageSize,
            totalPages = (int)Math.Ceiling(total / (double)pageSize)
        });
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Seller")]
    public async Task<IActionResult> Create([FromBody] CreateProductDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name) || string.IsNullOrWhiteSpace(dto.Sku))
            return BadRequest(new { message = "Name and SKU are required" });

        if (await repo.GetBySkuAsync(dto.Sku) is not null)
            return Conflict(new { message = $"SKU '{dto.Sku}' already exists" });

        var effectiveDto = IsAdmin ? dto : dto with { SellerId = CallerId };
        var product = await repo.CreateAsync(effectiveDto);
        logger.LogInformation("Product {Id} created: {Sku} by user {CallerId}", product.Id, product.Sku, CallerId);
        return CreatedAtAction(nameof(GetById), new { id = product.Id }, product);
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin,Seller")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateProductDto dto)
    {
        var product = await repo.GetByIdAsync(id);
        if (product is null) return NotFound(new { message = $"Product {id} not found" });

        if (!IsAdmin && product.SellerId != CallerId)
            return Forbid();

        var caller = User.FindFirstValue(ClaimTypes.Name) ?? "unknown";
        var updated = await repo.UpdateAsync(id, dto, caller);
        logger.LogInformation("Product {Id} updated by {Caller}", id, caller);
        return Ok(updated);
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin,Seller")]
    public async Task<IActionResult> Delete(int id)
    {
        var product = await repo.GetByIdAsync(id);
        if (product is null) return NotFound(new { message = $"Product {id} not found" });

        if (!IsAdmin && product.SellerId != CallerId)
            return Forbid();

        await repo.DeleteAsync(id);
        logger.LogInformation("Product {Id} deleted by user {CallerId}", id, CallerId);
        return NoContent();
    }

    [HttpPatch("{id:int}/stock")]
    [Authorize(Roles = "Admin,Seller")]
    public async Task<IActionResult> UpdateStock(int id, [FromBody] UpdateStockDto dto)
    {
        var product = await repo.GetByIdAsync(id);
        if (product is null) return NotFound(new { message = $"Product {id} not found" });

        if (!IsAdmin && product.SellerId != CallerId)
            return Forbid();

        await repo.UpdateStockAsync(id, dto.Delta);
        return NoContent();
    }

    /// <summary>
    /// POST api/products/{id}/images
    /// Uploads one or more images for a product.
    /// Images are stored in wwwroot/uploads/products/{id}/ and the paths
    /// are saved to the ProductImages table. Only the product owner (or Admin)
    /// can upload images for a given product.
    /// </summary>
    [HttpPost("{id:int}/images")]
    [Authorize(Roles = "Admin,Seller")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> UploadImages(int id, [FromForm] IFormFileCollection files)
    {
        if (files.Count == 0)
            return BadRequest(new { message = "No files provided" });

        var product = await repo.GetByIdAsync(id);
        if (product is null) return NotFound(new { message = $"Product {id} not found" });

        if (!IsAdmin && product.SellerId != CallerId)
            return Forbid();

        var allowedTypes = new[] { "image/jpeg", "image/png", "image/webp", "image/gif" };
        const long maxBytes = 5 * 1024 * 1024; // 5 MB per file

        var uploadFolder = Path.Combine(env.WebRootPath ?? "wwwroot", "uploads", "products", id.ToString());
        Directory.CreateDirectory(uploadFolder);

        var saved = new List<object>();

        foreach (var file in files)
        {
            if (!allowedTypes.Contains(file.ContentType.ToLower()))
                return BadRequest(new { message = $"File '{file.FileName}' has unsupported type {file.ContentType}. Allowed: jpeg, png, webp, gif" });

            if (file.Length > maxBytes)
                return BadRequest(new { message = $"File '{file.FileName}' exceeds 5 MB limit" });

            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            var fileName = $"{Guid.NewGuid()}{ext}";
            var filePath = Path.Combine(uploadFolder, fileName);

            await using var stream = System.IO.File.Create(filePath);
            await file.CopyToAsync(stream);

            // Relative URL served by the static files middleware
            var relativeUrl = $"/uploads/products/{id}/{fileName}";

            var image = await repo.AddImageAsync(id, relativeUrl, file.FileName, saved.Count == 0);
            saved.Add(new { image.Id, image.Url, image.IsMain });

            logger.LogInformation("Uploaded image {Url} for product {ProductId}", relativeUrl, id);
        }

        return Ok(new { uploaded = saved.Count, images = saved });
    }

    /// <summary>
    /// DELETE api/products/{id}/images/{imageId}
    /// Removes an image record and deletes the physical file.
    /// </summary>
    [HttpDelete("{id:int}/images/{imageId:int}")]
    [Authorize(Roles = "Admin,Seller")]
    public async Task<IActionResult> DeleteImage(int id, int imageId)
    {
        var product = await repo.GetByIdAsync(id);
        if (product is null) return NotFound(new { message = $"Product {id} not found" });

        if (!IsAdmin && product.SellerId != CallerId)
            return Forbid();

        var image = product.Images.FirstOrDefault(i => i.Id == imageId);
        if (image is null) return NotFound(new { message = $"Image {imageId} not found" });

        // Delete physical file
        var webRoot = env.WebRootPath ?? "wwwroot";
        var fullPath = Path.Combine(webRoot, image.Url.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));
        if (System.IO.File.Exists(fullPath))
            System.IO.File.Delete(fullPath);

        await repo.DeleteImageAsync(imageId);
        logger.LogInformation("Deleted image {ImageId} from product {ProductId}", imageId, id);
        return NoContent();
    }
}

public record UpdateStockDto(int Delta);

[ApiController]
[Route("api/[controller]")]
public class HealthController : ControllerBase
{
    [HttpGet]
    public IActionResult Get() => Ok(new
    {
        service = "ProductService",
        status = "healthy",
        timestamp = DateTime.UtcNow,
        version = "3.2.0"
    });
}