using Microsoft.EntityFrameworkCore;
using UserService.Data;
using UserService.Models;

namespace UserService.Repositories;

public interface IUserRepository
{
    Task<IEnumerable<User>> GetAllAsync(int page, int pageSize, string? search, bool? isActive);
    Task<User?> GetByIdAsync(int id);
    Task<User?> GetByEmailAsync(string email);
    Task<User> CreateAsync(CreateUserDto dto);
    Task<User?> UpdateAsync(int id, UpdateUserDto dto, string updatedBy);
    Task<bool> DeleteAsync(int id);
    Task<IEnumerable<User>> GetActiveAsync();
    Task<UserStats> GetStatsAsync();
    Task UpdateLastLoginAsync(int userId); // FIXED: track last login time
}

public class UserRepository(UserDbContext db) : IUserRepository
{
    public async Task<IEnumerable<User>> GetAllAsync(int page, int pageSize, string? search, bool? isActive)
    {
        var query = db.Users.AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(u =>
                u.Name.Contains(search) ||
                u.Email.Contains(search) ||
                u.Department.Contains(search));

        if (isActive.HasValue)
            query = query.Where(u => u.IsActive == isActive.Value);

        return await query
            .OrderBy(u => u.Name)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();
    }

    public async Task<User?> GetByIdAsync(int id) =>
        await db.Users.FindAsync(id);

    public async Task<User?> GetByEmailAsync(string email) =>
        await db.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == email.ToLower());

    public async Task<User> CreateAsync(CreateUserDto dto)
    {
        var user = new User
        {
            Name = dto.Name,
            Email = dto.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
            Role = dto.Role,
            Department = dto.Department,
            AvatarUrl = $"https://api.dicebear.com/7.x/avataaars/svg?seed={Uri.EscapeDataString(dto.Name)}"
        };
        db.Users.Add(user);
        await db.SaveChangesAsync();
        return user;
    }

    public async Task<User?> UpdateAsync(int id, UpdateUserDto dto, string updatedBy)
    {
        var user = await GetByIdAsync(id);
        if (user is null) return null;

        if (dto.Name is not null) user.Name = dto.Name;
        if (dto.Email is not null) user.Email = dto.Email;
        if (dto.Role is not null) user.Role = dto.Role;
        if (dto.IsActive.HasValue) user.IsActive = dto.IsActive.Value;
        if (dto.Department is not null) user.Department = dto.Department;

        user.UpdatedDate = DateTime.UtcNow;
        user.UpdatedBy = updatedBy;
        await db.SaveChangesAsync();
        return user;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var user = await GetByIdAsync(id);
        if (user is null) return false;
        db.Users.Remove(user);
        await db.SaveChangesAsync();
        return true;
    }

    public async Task<IEnumerable<User>> GetActiveAsync() =>
        await db.Users.Where(u => u.IsActive).OrderBy(u => u.Name).ToListAsync();

    public async Task<UserStats> GetStatsAsync()
    {
        var users = await db.Users.ToListAsync();
        return new UserStats
        {
            Total = users.Count,
            Active = users.Count(u => u.IsActive),
            Inactive = users.Count(u => !u.IsActive),
            ByDepartment = users.GroupBy(u => u.Department).ToDictionary(g => g.Key, g => g.Count()),
            ByRole = users.GroupBy(u => u.Role).ToDictionary(g => g.Key, g => g.Count())
        };
    }

    public async Task UpdateLastLoginAsync(int userId)
    {
        var user = await db.Users.FindAsync(userId);
        if (user is null) return;
        user.LastLoginAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
    }
}
