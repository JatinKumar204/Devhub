// Shared/ServiceRegistryEndpoint.cs
// Drop this file into any service's project root alongside DynamicPort.cs.
//
// Adds two endpoints to every service:
//
//   GET /api/health          — existing endpoint, now includes actualPort
//   GET /api/registry        — lightweight service-discovery endpoint
//
// The frontend's ServiceDiscoveryService calls /api/registry on port candidates
// to identify which service is running where.
//
// Usage in Program.cs — call AFTER app.Build(), BEFORE app.Run():
//
//   ServiceRegistryEndpoint.Map(app, serviceName: "UserService",
//       serviceId: "users", version: "3.0.0", actualPort: port);

public static class ServiceRegistryEndpoint
{
    public static void Map(
        WebApplication app,
        string serviceName,
        string serviceId,
        string version,
        int actualPort)
    {
        app.MapGet("/api/registry", () => Results.Ok(new
        {
            serviceId,          // e.g. "users" — matches Angular ServiceRegistryService id
            serviceName,        // e.g. "UserService" — human label
            version,
            port = actualPort,
            host = Environment.MachineName,
            status = "running",
            timestamp = DateTime.UtcNow
        }))
        .AllowAnonymous()
        .WithTags("Discovery");

        app.MapGet("/api/health/info", () => Results.Ok(new
        {
            service = serviceName,
            serviceId,
            status = "healthy",
            port = actualPort,
            host = Environment.MachineName,
            timestamp = DateTime.UtcNow,
            version
        }))
        .AllowAnonymous()
        .WithTags("Health");
    }
}
