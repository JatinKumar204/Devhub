<#
.SYNOPSIS
    Start all DevHub services locally for development.

.DESCRIPTION
    Launches SQL Server (Docker), all .NET microservices, and the Angular frontend
    in parallel, each in its own PowerShell window.

    Dynamic port mode (default): services find their own free port starting at the
    base port (3001-3006). If a base port is busy the service climbs until it finds
    a free one. Use the /config page or "Discover" button in the frontend to locate
    the actual ports each service landed on.

    Static port mode (-StaticPorts): passes PORT env var to each service so they
    use exactly the configured port. Use this when you need predictable ports (CI,
    integration tests, multiple devs on the same machine who've agreed on ports).

.PARAMETER SkipSql
    Skip starting the SQL Server container (use if SQL Server is already running).

.PARAMETER Services
    Which services to start. Default: all.
    Valid values: users, products, orders, cart, wishlist, categories, frontend

.PARAMETER StaticPorts
    Use fixed ports instead of dynamic allocation. Services get:
      users=3001, products=3002, orders=3003, cart=3004, wishlist=3005, categories=3006

.EXAMPLE
    # Dynamic mode (recommended for local dev — no port conflicts)
    .\start-local.ps1

    # Static mode (predictable ports for scripts / integration tests)
    .\start-local.ps1 -StaticPorts

    # Start only changed services, skip SQL
    .\start-local.ps1 -SkipSql -Services users,products,frontend
#>
param(
    [switch]  $SkipSql,
    [switch]  $StaticPorts,
    [string[]]$Services = @('users','products','orders','cart','wishlist','categories','frontend')
)

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot

Write-Host "`n⚡ DevHub — Local Dev Startup" -ForegroundColor Cyan
Write-Host "   Machine : $env:COMPUTERNAME" -ForegroundColor DarkGray
Write-Host "   Mode    : $(if ($StaticPorts) { 'Static ports' } else { 'Dynamic port allocation' })`n" -ForegroundColor DarkGray

function Start-InWindow {
    param([string]$Title, [string]$WorkDir, [string]$Command)
    Start-Process powershell `
        -ArgumentList "-NoExit", "-Command", "cd '$WorkDir'; $Command" `
        -WorkingDirectory $WorkDir
    Write-Host "  Started: $Title" -ForegroundColor Green
}

# ─── SQL Server via Docker ────────────────────────────────────────────────────
if (-not $SkipSql) {
    Write-Host "[SQL] Starting SQL Server container..." -ForegroundColor Yellow
    $sqlRunning = docker ps --filter "name=devhub_sqlserver" --format "{{.Names}}" 2>$null
    if ($sqlRunning -ne 'devhub_sqlserver') {
        docker run -d --name devhub_sqlserver `
            -e ACCEPT_EULA=Y `
            -e SA_PASSWORD='DevHub@2025!' `
            -p 1433:1433 `
            mcr.microsoft.com/mssql/server:2022-latest | Out-Null
        Write-Host "  Container starting — waiting 15s for SQL to be ready..." -ForegroundColor DarkGray
        Start-Sleep -Seconds 15
    }
    else {
        Write-Host "  SQL Server already running" -ForegroundColor DarkGray
    }
}

# ─── Service definitions ──────────────────────────────────────────────────────
# BasePort: where DynamicPort.Resolve() starts scanning
# StaticPort: what gets passed via PORT= env var in static mode
$serviceMap = @{
    users      = @{ Dir = 'services\UserService';     BasePort = 3001 }
    products   = @{ Dir = 'services\ProductService';  BasePort = 3002 }
    orders     = @{ Dir = 'services\OrderService';    BasePort = 3003 }
    cart       = @{ Dir = 'services\CartService';     BasePort = 3004 }
    wishlist   = @{ Dir = 'services\WishlistService'; BasePort = 3005 }
    categories = @{ Dir = 'services\CategoryService'; BasePort = 3006 }
}

# ─── Start .NET services ──────────────────────────────────────────────────────
foreach ($svc in ($Services | Where-Object { $_ -ne 'frontend' })) {
    if (-not $serviceMap.ContainsKey($svc)) {
        Write-Warning "Unknown service '$svc' — skipping"
        continue
    }
    $cfg = $serviceMap[$svc]
    $dir = Join-Path $root $cfg.Dir

    if (-not (Test-Path $dir)) {
        Write-Warning "Service directory not found: $dir — skipping $svc"
        continue
    }

    if ($StaticPorts) {
        # Static mode: pin to base port — same behaviour as the old start-local.ps1
        $port = $cfg.BasePort
        Write-Host "Starting $svc on :$port (static)..." -ForegroundColor Yellow
        $cmd = "`$env:PORT='$port'; `$env:ASPNETCORE_ENVIRONMENT='Development'; dotnet run"
    }
    else {
        # Dynamic mode: no PORT env var — DynamicPort.Resolve() scans from base port
        Write-Host "Starting $svc (dynamic, base port $($cfg.BasePort))..." -ForegroundColor Yellow
        $cmd = "`$env:ASPNETCORE_ENVIRONMENT='Development'; dotnet run"
    }

    Start-InWindow -Title "$svc" -WorkDir $dir -Command $cmd
}

# ─── Angular frontend ─────────────────────────────────────────────────────────
if ($Services -contains 'frontend') {
    Write-Host "Starting Angular frontend on :4200..." -ForegroundColor Yellow
    $frontendDir = Join-Path $root 'Frontend'
    $cmd = "`$env:DEVHUB_MACHINE='$env:COMPUTERNAME'; npx ng serve --host 0.0.0.0 --port 4200"
    Start-InWindow -Title "Frontend (:4200)" -WorkDir $frontendDir -Command $cmd
}

# ─── Summary ─────────────────────────────────────────────────────────────────
Write-Host "`nAll services launching in separate windows." -ForegroundColor Green
Write-Host ""
Write-Host "  Frontend  : http://localhost:4200"
Write-Host ""

if ($StaticPorts) {
    Write-Host "  Static ports (predictable):"
    foreach ($name in $serviceMap.Keys | Sort-Object) {
        if ($Services -contains $name) {
            $port = $serviceMap[$name].BasePort
            Write-Host "    $name`: http://localhost:$port/api/health"
        }
    }
}
else {
    Write-Host "  Dynamic ports — use one of these to find actual ports:" -ForegroundColor DarkGray
    Write-Host "    Config page  : http://localhost:4200/config  → click 'Discover'" -ForegroundColor Cyan
    Write-Host "    Base ports   : 3001 (users) 3002 (products) 3003 (orders)" -ForegroundColor DarkGray
    Write-Host "                   3004 (cart)  3005 (wishlist) 3006 (categories)" -ForegroundColor DarkGray
    Write-Host "    Probe:  http://localhost:3001/api/registry  (or next port if 3001 is busy)" -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "  Run migrations : .\migrate.ps1" -ForegroundColor DarkGray
Write-Host ""
