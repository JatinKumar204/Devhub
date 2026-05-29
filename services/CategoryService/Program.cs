// services/CategoryService/Program.cs
using CategoryService.Data;
using CategoryService.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Serilog;
using System.Text;

try
{
    var port = DynamicPort.Resolve("CategoryService", 3006);

    Log.Logger = new LoggerConfiguration()
        .WriteTo.Console(outputTemplate: "[{Timestamp:HH:mm:ss} {Level:u3}] {Message:lj}{NewLine}{Exception}")
        .WriteTo.File("logs/categoryservice-.log", rollingInterval: RollingInterval.Day)
        .CreateLogger();

    var builder = WebApplication.CreateBuilder(args);
    builder.Host.UseSerilog();
    builder.WebHost.UseUrls($"http://0.0.0.0:{port}");

    builder.Services.AddDbContext<CategoryDbContext>(opts =>
        opts.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));
    builder.Services.AddScoped<ICategoryRepository, CategoryRepository>();
    builder.Services.AddControllers();
    builder.Services.AddEndpointsApiExplorer();
    builder.Services.AddSwaggerGen();

    var jwtSecret = builder.Configuration["Jwt:Secret"] ?? string.Empty;
    var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "CategoryService";
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
    builder.Services.AddHealthChecks().AddDbContextCheck<CategoryDbContext>();
    builder.Services.AddCors(opts =>
        opts.AddPolicy("AllowAll", p => p.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod()));

    var app = builder.Build();

    using (var scope = app.Services.CreateScope())
    {
        var db = scope.ServiceProvider.GetRequiredService<CategoryDbContext>();
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
        serviceName: "CategoryService",
        serviceId: "category",
        version: "1.0.0",
        actualPort: port);

    Log.Information("CategoryService v1.0 listening on http://0.0.0.0:{Port}", port);
    app.Run();
}
catch (HostAbortedException) { }
catch (Exception ex) { Log.Fatal(ex, "CategoryService failed to start"); throw; }
finally { Log.CloseAndFlush(); }
