using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using UserService.Data;
using UserService.Models;
using UserService.Repositories;
using Xunit;

namespace UserService.Tests.Repositories;

public class UserRepositoryTests : IDisposable
{
    private readonly UserDbContext _db;
    private readonly UserRepository _repo;

    public UserRepositoryTests()
    {
        var options = new DbContextOptionsBuilder<UserDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        _db = new UserDbContext(options);
        _repo = new UserRepository(_db);
        SeedData();
    }

    private void SeedData()
    {
        _db.Users.AddRange(
            new User { Id = 1, Name = "Alice", Email = "alice@test.com", PasswordHash = "hash", Role = "Admin", Department = "Engineering", IsActive = true },
            new User { Id = 2, Name = "Bob", Email = "bob@test.com", PasswordHash = "hash", Role = "User", Department = "Engineering", IsActive = true },
            new User { Id = 3, Name = "Carol", Email = "carol@test.com", PasswordHash = "hash", Role = "User", Department = "Product", IsActive = false }
        );
        _db.SaveChanges();
    }

    [Fact]
    public async Task GetAllAsync_ReturnsAllUsers_WhenNoFilter()
    {
        var result = await _repo.GetAllAsync(1, 20, null, null);
        result.Should().HaveCount(3);
    }

    [Fact]
    public async Task GetAllAsync_FiltersActiveUsers()
    {
        var result = await _repo.GetAllAsync(1, 20, null, true);
        result.Should().HaveCount(2).And.OnlyContain(u => u.IsActive);
    }

    [Fact]
    public async Task GetAllAsync_SearchByName()
    {
        var result = await _repo.GetAllAsync(1, 20, "alice", null);
        result.Should().HaveCount(1);
        result.First().Name.Should().Be("Alice");
    }

    [Fact]
    public async Task GetByIdAsync_ReturnsCorrectUser()
    {
        var user = await _repo.GetByIdAsync(1);
        user.Should().NotBeNull();
        user!.Email.Should().Be("alice@test.com");
    }

    [Fact]
    public async Task GetByIdAsync_ReturnsNull_WhenNotFound()
    {
        var user = await _repo.GetByIdAsync(999);
        user.Should().BeNull();
    }

    [Fact]
    public async Task CreateAsync_AddsUserToDatabase()
    {
        var dto = new CreateUserDto("Dave", "dave@test.com", "Pass@123", "User", "HR");
        var created = await _repo.CreateAsync(dto);

        created.Id.Should().BeGreaterThan(0);
        created.Name.Should().Be("Dave");
        _db.Users.Count().Should().Be(4);
    }

    [Fact]
    public async Task UpdateAsync_ModifiesUserFields()
    {
        var dto = new UpdateUserDto("Alice Updated", null, null, null, null);
        var updated = await _repo.UpdateAsync(1, dto, "test-runner");

        updated.Should().NotBeNull();
        updated!.Name.Should().Be("Alice Updated");
        updated.UpdatedBy.Should().Be("test-runner");
        updated.UpdatedDate.Should().NotBeNull();
    }

    [Fact]
    public async Task DeleteAsync_RemovesUser()
    {
        var result = await _repo.DeleteAsync(1);
        result.Should().BeTrue();
        _db.Users.Count().Should().Be(2);
    }

    [Fact]
    public async Task DeleteAsync_ReturnsFalse_WhenNotFound()
    {
        var result = await _repo.DeleteAsync(999);
        result.Should().BeFalse();
    }

    [Fact]
    public async Task GetStatsAsync_ReturnsCorrectTotals()
    {
        var stats = await _repo.GetStatsAsync();
        stats.Total.Should().Be(3);
        stats.Active.Should().Be(2);
        stats.Inactive.Should().Be(1);
        stats.ByDepartment.Should().ContainKey("Engineering").WhoseValue.Should().Be(2);
    }

    public void Dispose() => _db.Dispose();
}
