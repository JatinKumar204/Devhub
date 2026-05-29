// services/UserService/Program.cs
// CHANGES from Phase 5 version:
//   - Registers IHttpContextAccessor (needed by TokenService for IP capture)
//   - Calls builder.Services.AddDevHubSecurity()
//   - Calls app.UseDevHubSecurity() in the pipeline
//   - Maps controllers with .RequireRateLimiting("api")
//   - Auth endpoints individually get .RequireRateLimiting("auth")
//     via [EnableRateLimiting] attribute on AuthController
//   - Registers RefreshToken DbSet (via updated UserDbContext)
//   All other registrations UNCHANGED.

using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Serilog;
using UserService.Data;
using UserService.Repositories;
using UserService.Services;

try
{
    var port = DynamicPort.Resolve("UserService", basePort: 3001);

    Log.Logger = new LoggerConfiguration()
        .WriteTo.Console(outputTemplate: "[{Timestamp:HH:mm:ss} {Level:u3}] [{CorrelationId}] {Message:lj}{NewLine}{Exception}")
        .WriteTo.File("logs/userservice-.log",
            rollingInterval: RollingInterval.Day,
            outputTemplate: "{Timestamp:yyyy-MM-dd HH:mm:ss.fff} [{Level:u3}] [{CorrelationId}] {Message:lj}{NewLine}{Exception}")
        .Enrich.FromLogContext()        // enables CorrelationId enrichment
        .CreateLogger();

    var builder = WebApplication.CreateBuilder(args);
    builder.Host.UseSerilog();
    builder.WebHost.UseUrls($"http://0.0.0.0:{port}");

    builder.Services.AddDbContext<UserDbContext>(opts =>
        opts.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

    builder.Services.AddHttpContextAccessor();                          // NEW — for IP in TokenService
    builder.Services.AddScoped<IUserRepository, UserRepository>();
    builder.Services.AddScoped<ISellerVerificationRepository, SellerVerificationRepository>();
    builder.Services.AddScoped<INotificationRepository, NotificationRepository>();
    builder.Services.AddScoped<NotificationWriter>();
    builder.Services.AddScoped<ITokenService, TokenService>();
    builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(
            new System.Text.Json.Serialization.JsonStringEnumConverter());
    });
    builder.Services.AddEndpointsApiExplorer();

    var jwtSecret = builder.Configuration["Jwt:Secret"] ?? string.Empty;
    var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "UserService";
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
                ValidateIssuer = true,
                ValidIssuer = jwtIssuer,
                ValidateAudience = true,
                ValidAudience = jwtAudience,
                ClockSkew = TimeSpan.Zero
            };
        });

    builder.Services.AddAuthorization();
    builder.Services.AddDevHubSecurity(builder.Configuration);         // NEW

    builder.Services.AddSwaggerGen(c =>
    {
        c.SwaggerDoc("v1", new OpenApiInfo { Title = "UserService API", Version = "v1" });
        c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
        {
            In = ParameterLocation.Header,
            Name = "Authorization",
            Type = SecuritySchemeType.ApiKey,
            Scheme = "Bearer"
        });
        c.AddSecurityRequirement(new OpenApiSecurityRequirement
        {
            {
                new OpenApiSecurityScheme { Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" } },
                Array.Empty<string>()
            }
        });
    });

    builder.Services.AddHealthChecks().AddDbContextCheck<UserDbContext>();
    builder.Services.AddCors(opts =>
        opts.AddPolicy("AllowAll", p => p.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod()));

    var app = builder.Build();

    using (var scope = app.Services.CreateScope())
    {
        var db = scope.ServiceProvider.GetRequiredService<UserDbContext>();
        db.Database.Migrate();
    }
    DynamicPort.ReleaseAll();
    app.UseCors("AllowAll");
    app.UseDevHubSecurity();                                            // NEW — correlation ID + headers + rate limiting
    app.UseStaticFiles();
    app.UseAuthentication();
    app.UseAuthorization();

    if (app.Environment.IsDevelopment())
    {
        app.UseSwagger();
        app.UseSwaggerUI();
    }

    // Apply default "api" rate limit to all controller endpoints
    // Auth endpoints override with "auth" via [EnableRateLimiting("auth")] attribute
    app.MapControllers().RequireRateLimiting("api");
    app.MapHealthChecks("/api/health");
    app.MapGet("/", () => Results.Redirect("/api/health"));

    ServiceRegistryEndpoint.Map(app,
        serviceName: "UserService",
        serviceId: "users",
        version: "3.3.0",
        actualPort: port);

    Log.Information("UserService v3.3 listening on http://0.0.0.0:{Port}", port);
    app.Run();
}
catch (HostAbortedException) { }
catch (Exception ex) { Log.Fatal(ex, "UserService failed to start"); throw; }
finally { Log.CloseAndFlush(); }
