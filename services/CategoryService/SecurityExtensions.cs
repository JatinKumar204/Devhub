// Shared/SecurityExtensions.cs
// Drop this file into each service's project root (same as DynamicPort.cs).
//
// Adds:
//   1. Rate limiting — .NET 8 built-in (no extra NuGet needed)
//   2. Security response headers (XSS, clickjacking, content sniffing)
//   3. Correlation ID middleware (structured logging across services)
//
// Usage in Program.cs — call after builder.Services.AddAuthentication():
//
//   builder.Services.AddDevHubSecurity(builder.Configuration);
//   ...
//   var app = builder.Build();
//   app.UseDevHubSecurity();

using System.Net;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;
using Serilog.Context;

public static class SecurityExtensions
{
    // ── Service registration ──────────────────────────────────────────────────

    public static IServiceCollection AddDevHubSecurity(
        this IServiceCollection services,
        IConfiguration config)
    {
        // Correlation ID support
        services.AddHttpContextAccessor();

        // Rate limiting (.NET 8 built-in — no NuGet package needed)
        services.AddRateLimiter(opts =>
        {
            opts.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

            // Auth endpoints — strict: 10 requests per minute per IP
            // Protects login and register from brute force
            opts.AddPolicy("auth", context =>
                RateLimitPartition.GetFixedWindowLimiter(
                    partitionKey: context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                    factory: _ => new FixedWindowRateLimiterOptions
                    {
                        PermitLimit          = 10,
                        Window               = TimeSpan.FromMinutes(1),
                        QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                        QueueLimit           = 0
                    }));

            // API endpoints — generous: 200 requests per minute per IP
            opts.AddPolicy("api", context =>
                RateLimitPartition.GetFixedWindowLimiter(
                    partitionKey: context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                    factory: _ => new FixedWindowRateLimiterOptions
                    {
                        PermitLimit          = 200,
                        Window               = TimeSpan.FromMinutes(1),
                        QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                        QueueLimit           = 5
                    }));

            // File upload endpoints — 20 per minute per IP
            opts.AddPolicy("upload", context =>
                RateLimitPartition.GetFixedWindowLimiter(
                    partitionKey: context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                    factory: _ => new FixedWindowRateLimiterOptions
                    {
                        PermitLimit          = 20,
                        Window               = TimeSpan.FromMinutes(1),
                        QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                        QueueLimit           = 0
                    }));

            // On rejection: log the event
            opts.OnRejected = async (context, _) =>
            {
                var logger = context.HttpContext.RequestServices
                    .GetRequiredService<ILogger<Program>>();
                logger.LogWarning(
                    "Rate limit exceeded: {Method} {Path} from {Ip}",
                    context.HttpContext.Request.Method,
                    context.HttpContext.Request.Path,
                    context.HttpContext.Connection.RemoteIpAddress);
                context.HttpContext.Response.ContentType = "application/json";
                await context.HttpContext.Response.WriteAsync(
                    "{\"message\":\"Too many requests. Please slow down.\"}");
            };
        });

        return services;
    }

    // ── Middleware pipeline ───────────────────────────────────────────────────

    public static WebApplication UseDevHubSecurity(this WebApplication app)
    {
        // 1. Correlation ID — add to every request and log context
        app.Use(async (context, next) =>
        {
            var correlationId = context.Request.Headers["X-Correlation-ID"].FirstOrDefault()
                                ?? Guid.NewGuid().ToString("N")[..12];

            context.Response.Headers["X-Correlation-ID"] = correlationId;

            using (LogContext.PushProperty("CorrelationId", correlationId))
            using (LogContext.PushProperty("RequestPath", context.Request.Path.Value))
            {
                await next();
            }
        });

        // 2. Security headers
        app.Use(async (context, next) =>
        {
            var headers = context.Response.Headers;

            // Prevent clickjacking
            headers["X-Frame-Options"]        = "DENY";
            // Prevent MIME sniffing
            headers["X-Content-Type-Options"] = "nosniff";
            // XSS protection (legacy browsers)
            headers["X-XSS-Protection"]       = "1; mode=block";
            // Referrer policy
            headers["Referrer-Policy"]        = "strict-origin-when-cross-origin";
            // Remove server header
            headers.Remove("Server");

            // In production HTTPS deployments, also add:
            // headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains";

            await next();
        });

        // 3. Rate limiting middleware
        app.UseRateLimiter();

        return app;
    }
}

// ── Attribute shorthand for controllers ──────────────────────────────────────
// Apply these to individual endpoints or controller classes:
//
//   [EnableRateLimiting("auth")]   — on AuthController login/register
//   [EnableRateLimiting("upload")] — on file upload endpoints
//   [EnableRateLimiting("api")]    — default for all other endpoints
//
// Or apply globally in Program.cs:
//   app.MapControllers().RequireRateLimiting("api");
