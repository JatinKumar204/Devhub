// services/OrderService/Program.cs
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Serilog;
using OrderService.Data;
using OrderService.Repositories;

try
{
    var port = DynamicPort.Resolve("OrderService", 3003);

    Log.Logger = new LoggerConfiguration()
        .WriteTo.Console(outputTemplate: "[{Timestamp:HH:mm:ss} {Level:u3}] {Message:lj}{NewLine}{Exception}")
        .WriteTo.File("logs/orderservice-.log", rollingInterval: RollingInterval.Day)
        .CreateLogger();

    var builder = WebApplication.CreateBuilder(args);
    builder.Host.UseSerilog();
    builder.WebHost.UseUrls($"http://0.0.0.0:{port}");

    builder.Services.AddDbContext<OrderDbContext>(opts =>
        opts.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));
    builder.Services.AddScoped<IOrderRepository, OrderRepository>();
    builder.Services.AddControllers();
    builder.Services.AddEndpointsApiExplorer();
    builder.Services.AddSwaggerGen();

    var jwtSecret = builder.Configuration["Jwt:Secret"] ?? string.Empty;
    var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "OrderService";
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
    builder.Services.AddHealthChecks().AddDbContextCheck<OrderDbContext>();
    builder.Services.AddCors(opts =>
        opts.AddPolicy("AllowAll", p => p.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod()));

    var app = builder.Build();

    using (var scope = app.Services.CreateScope())
    {
        var db = scope.ServiceProvider.GetRequiredService<OrderDbContext>();
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
    app.MapGet("/", () => Results.Redirect("/api/health"));

    ServiceRegistryEndpoint.Map(app,
        serviceName: "OrderService",
        serviceId: "orders",
        version: "2.0.0",
        actualPort: port);

    Log.Information("OrderService v2.0 listening on http://0.0.0.0:{Port}", port);
    app.Run();
}
catch (HostAbortedException) { }
catch (Exception ex) { Log.Fatal(ex, "OrderService failed to start"); throw; }
finally { Log.CloseAndFlush(); }
