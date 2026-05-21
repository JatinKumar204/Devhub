<#
.SYNOPSIS
    Start all DevHub services locally for development.

.DESCRIPTION
    Launches SQL Server (Docker), all .NET microservices, and the Angular frontend
    in parallel, each in its own PowerShell window. Requires .NET 9 SDK, Node 20, Docker.

.PARAMETER SkipSql
    Skip starting the SQL Server container (use if SQL Server is already running).

.PARAMETER Services
    Which services to start. Default: all.
    Valid values: users, products, orders, cart, wishlist, categories, frontend

.EXAMPLE
    # Start everything
    .\start-local.ps1

    # Start only the three services with recent changes
    .\start-local.ps1 -Services users,products,frontend

    # Skip SQL (already running) and start only new services
    .\start-local.ps1 -SkipSql -Services cart,wishlist,categories
#>
param(
    [switch]  $SkipSql,
    [string[]]$Services = @('users','products','orders','cart','wishlist','categories','frontend')
)

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot

Write-Host "`n DevHub — Local Dev Startup" -ForegroundColor Cyan
Write-Host " Machine: $env:COMPUTERNAME`n" -ForegroundColor DarkGray

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
$serviceMap = @{
    users      = @{ Dir = 'services\UserService';     Port = 3001 }
    products   = @{ Dir = 'services\ProductService';  Port = 3002 }
    orders     = @{ Dir = 'services\OrderService';    Port = 3003 }
    cart       = @{ Dir = 'services\CartService';     Port = 3004 }
    wishlist   = @{ Dir = 'services\WishlistService'; Port = 3005 }
    categories = @{ Dir = 'services\CategoryService'; Port = 3006 }
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
    Write-Host "Starting $svc on :$($cfg.Port)..." -ForegroundColor Yellow
    $cmd = "`$env:PORT='$($cfg.Port)'; `$env:ASPNETCORE_ENVIRONMENT='Development'; dotnet run"
    Start-InWindow -Title "$svc (:$($cfg.Port))" -WorkDir $dir -Command $cmd
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
Write-Host "  Frontend         : http://localhost:4200"
Write-Host "  User Service     : http://localhost:3001/api/health"
Write-Host "  Product Service  : http://localhost:3002/api/health"
Write-Host "  Order Service    : http://localhost:3003/api/health"
Write-Host "  Cart Service     : http://localhost:3004/api/health"
Write-Host "  Wishlist Service : http://localhost:3005/api/health"
Write-Host "  Category Service : http://localhost:3006/api/health"
Write-Host ""
Write-Host "  Config / registry page: http://localhost:4200/config" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  To run EF migrations:" -ForegroundColor DarkGray
Write-Host "    .\migrate.ps1" -ForegroundColor DarkGray
