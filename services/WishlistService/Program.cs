// services/WishlistService/Program.cs
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Serilog;
using WishlistService.Data;
using WishlistService.Repositories;

try
{
    var port = DynamicPort.Resolve("WishlistService", 3005);

    Log.Logger = new LoggerConfiguration()
        .WriteTo.Console(outputTemplate: "[{Timestamp:HH:mm:ss} {Level:u3}] {Message:lj}{NewLine}{Exception}")
        .WriteTo.File("logs/wishlistservice-.log", rollingInterval: RollingInterval.Day)
        .CreateLogger();

    var builder = WebApplication.CreateBuilder(args);
    builder.Host.UseSerilog();
    builder.WebHost.UseUrls($"http://0.0.0.0:{port}");

    builder.Services.AddDbContext<WishlistDbContext>(opts =>
        opts.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));
    builder.Services.AddScoped<IWishlistRepository, WishlistRepository>();
    builder.Services.AddControllers();
    builder.Services.AddEndpointsApiExplorer();
    builder.Services.AddSwaggerGen();

    var jwtSecret = builder.Configuration["Jwt:Secret"] ?? string.Empty;
    var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "WishlistService";
    var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "DevHub";

    builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
        .AddJwtBearer(opts =>
        {
            opts.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuerSigningKey = !string.IsNullOrEmpty(jwtSecret),
                IssuerSigningKey = string.IsNullOrEmpty(jwtSecret)
                    ? null
                    : new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
                ValidateIssuer = false,
                ValidateAudience = false,
                ClockSkew = TimeSpan.Zero
            };
        });

    builder.Services.AddAuthorization();
    builder.Services.AddHealthChecks().AddDbContextCheck<WishlistDbContext>();
    builder.Services.AddCors(opts =>
        opts.AddPolicy("AllowAll", p => p.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod()));

    var app = builder.Build();

    using (var scope = app.Services.CreateScope())
    {
        var db = scope.ServiceProvider.GetRequiredService<WishlistDbContext>();
        db.Database.Migrate();
    }
    DynamicPort.ReleaseAll();
    app.UseCors("AllowAll");
    app.UseAuthentication();
    app.UseAuthorization();

    if (app.Environment.IsDevelopment())
    {
        app.UseSwagger();
        app.UseSwaggerUI();
    }

    app.MapControllers();
    app.MapHealthChecks("/api/health");

    ServiceRegistryEndpoint.Map(app,
        serviceName: "WishlistService",
        serviceId: "wishlist",
        version: "1.0.0",
        actualPort: port);

    Log.Information("WishlistService v1.0 listening on http://0.0.0.0:{Port}", port);
    app.Run();
}
catch (HostAbortedException) { }
catch (Exception ex) { Log.Fatal(ex, "WishlistService failed to start"); throw; }
finally { Log.CloseAndFlush(); }
