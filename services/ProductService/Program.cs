// services/ProductService/Program.cs
// Changes from previous version:
//   1. Registers "ApprovedSeller" authorization policy
//   2. Registers SellerApprovedHandler as singleton
//   3. Dynamic port allocation (from Phase 0)
//   Everything else is IDENTICAL to the original.

using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using ProductService.Authorization;
using ProductService.Data;
using ProductService.Repositories;
using Serilog;

try
{
    var port = DynamicPort.Resolve("ProductService", 3002);

    Log.Logger = new LoggerConfiguration()
        .WriteTo.Console(outputTemplate: "[{Timestamp:HH:mm:ss} {Level:u3}] {Message:lj}{NewLine}{Exception}")
        .WriteTo.File("logs/productservice-.log", rollingInterval: RollingInterval.Day)
        .CreateLogger();

    var builder = WebApplication.CreateBuilder(args);
    builder.Host.UseSerilog();
    builder.WebHost.UseUrls($"http://0.0.0.0:{port}");

    builder.Services.AddDbContext<ProductDbContext>(opts =>
        opts.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

    builder.Services.AddScoped<IProductRepository, ProductRepository>();
    builder.Services.AddScoped<IProductReviewRepository, ProductReviewRepository>();
    builder.Services.AddControllers();
    builder.Services.AddEndpointsApiExplorer();
    builder.Services.AddSwaggerGen();

    var jwtSecret = builder.Configuration["Jwt:Secret"] ?? string.Empty;
    var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "ProductService";
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
    builder.Services.AddDevHubSecurity(builder.Configuration);
    // ── CHANGED: register ApprovedSeller policy ───────────────────────────────
    builder.Services.AddAuthorization(opts =>
    {
        // Existing implicit policies still work — [Authorize(Roles="Admin,Seller")] etc.
        // ApprovedSeller is the new policy that gates product creation/update/delete.
        opts.AddPolicy("ApprovedSeller", policy =>
            policy.Requirements.Add(new SellerApprovedRequirement()));
    });

    // Handler reads the "verificationStatus" claim from the JWT
    builder.Services.AddSingleton<IAuthorizationHandler, SellerApprovedHandler>();
    // ─────────────────────────────────────────────────────────────────────────

    builder.Services.AddHealthChecks().AddDbContextCheck<ProductDbContext>();
    builder.Services.AddCors(opts =>
        opts.AddPolicy("AllowAll", p => p.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod()));

    var app = builder.Build();

    using (var scope = app.Services.CreateScope())
    {
        var db = scope.ServiceProvider.GetRequiredService<ProductDbContext>();
        db.Database.Migrate();
    }
    DynamicPort.ReleaseAll();
    app.UseCors("AllowAll");
    app.UseDevHubSecurity();
    app.UseStaticFiles();
    app.UseAuthentication();
    app.UseAuthorization();

    if (app.Environment.IsDevelopment())
    {
        app.UseSwagger();
        app.UseSwaggerUI();
    }

    app.MapControllers().RequireRateLimiting("api");
    app.MapHealthChecks("/api/health");

    ServiceRegistryEndpoint.Map(app,
        serviceName: "ProductService",
        serviceId: "products",
        version: "3.2.0",
        actualPort: port);

    Log.Information("ProductService v3.2 listening on http://0.0.0.0:{Port}", port);
    app.Run();
}
catch (HostAbortedException) { }
catch (Exception ex)
{
    Log.Fatal(ex, "ProductService failed to start");
    throw;
}
finally
{
    Log.CloseAndFlush();
}
