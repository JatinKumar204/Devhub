using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Moq;
using UserService.Controllers;
using UserService.Models;
using UserService.Repositories;
using Xunit;

namespace UserService.Tests.Controllers;

public class UsersControllerTests
{
    private readonly Mock<IUserRepository> _repoMock = new();
    private readonly Mock<ILogger<UsersController>> _loggerMock = new();

    private UsersController BuildController() =>
        new(_repoMock.Object, _loggerMock.Object);

    [Fact]
    public async Task GetAll_ReturnsOk_WithUsers()
    {
        var users = new List<User>
        {
            new() { Id = 1, Name = "Alice", Email = "alice@test.com", Role = "Admin", Department = "Eng" }
        };
        _repoMock.Setup(r => r.GetAllAsync(1, 20, null, null)).ReturnsAsync(users);

        var controller = BuildController();
        var result = await controller.GetAll();

        result.Should().BeOfType<OkObjectResult>()
            .Which.Value.Should().BeEquivalentTo(users);
    }

    [Fact]
    public async Task GetById_ReturnsNotFound_WhenMissing()
    {
        _repoMock.Setup(r => r.GetByIdAsync(99)).ReturnsAsync((User?)null);
        var controller = BuildController();

        var result = await controller.GetById(99);
        result.Should().BeOfType<NotFoundObjectResult>();
    }

    [Fact]
    public async Task Create_ReturnsBadRequest_WhenNameEmpty()
    {
        var controller = BuildController();
        var result = await controller.Create(new CreateUserDto("", "e@e.com", "pass"));
        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task Create_ReturnsConflict_WhenEmailExists()
    {
        _repoMock.Setup(r => r.GetByEmailAsync("dup@test.com"))
            .ReturnsAsync(new User { Id = 1, Name = "Existing", Email = "dup@test.com", PasswordHash = "" });
        var controller = BuildController();

        var result = await controller.Create(new CreateUserDto("New", "dup@test.com", "pass"));
        result.Should().BeOfType<ConflictObjectResult>();
    }

    [Fact]
    public async Task Delete_ReturnsNoContent_WhenSuccessful()
    {
        _repoMock.Setup(r => r.DeleteAsync(1)).ReturnsAsync(true);
        var controller = BuildController();

        var result = await controller.Delete(1);
        result.Should().BeOfType<NoContentResult>();
    }

    [Fact]
    public async Task Delete_ReturnsNotFound_WhenMissing()
    {
        _repoMock.Setup(r => r.DeleteAsync(99)).ReturnsAsync(false);
        var controller = BuildController();

        var result = await controller.Delete(99);
        result.Should().BeOfType<NotFoundObjectResult>();
    }
}
