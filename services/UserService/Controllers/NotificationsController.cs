// services/UserService/Controllers/NotificationsController.cs
// NEW FILE
//
// Routes:
//   GET    /api/notifications              — paginated list for current user
//   GET    /api/notifications/unread-count — just the count (used for bell badge)
//   PATCH  /api/notifications/{id}/read   — mark one as read
//   PATCH  /api/notifications/read-all    — mark all as read

using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UserService.Repositories;

namespace UserService.Controllers;

[ApiController]
[Route("api/notifications")]
[Authorize]
[Produces("application/json")]
public class NotificationsController(INotificationRepository repo) : ControllerBase
{
    private int UserId =>
        int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : 0;

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int  page        = 1,
        [FromQuery] int  pageSize    = 20,
        [FromQuery] bool unreadOnly  = false)
    {
        var result = await repo.GetForUserAsync(UserId, page, pageSize, unreadOnly);
        return Ok(result);
    }

    [HttpGet("unread-count")]
    public async Task<IActionResult> GetUnreadCount()
    {
        var count = await repo.GetUnreadCountAsync(UserId);
        return Ok(new { count });
    }

    [HttpPatch("{id:int}/read")]
    public async Task<IActionResult> MarkRead(int id)
    {
        await repo.MarkReadAsync(id, UserId);
        return NoContent();
    }

    [HttpPatch("read-all")]
    public async Task<IActionResult> MarkAllRead()
    {
        await repo.MarkAllReadAsync(UserId);
        return NoContent();
    }
}
