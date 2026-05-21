<#
.SYNOPSIS
    Run EF Core database migrations for all (or selected) DevHub services.

.PARAMETER Action
    add    — create a new migration
    update — apply pending migrations to the database  (default)
    remove — remove the last migration
    script — generate an idempotent SQL script

.PARAMETER Name
    Migration name, required when Action = 'add'

.PARAMETER Services
    Which services to migrate. Default: all (in dependency order).
    Valid values: UserService, CategoryService, ProductService,
                  CartService, WishlistService, OrderService

.EXAMPLE
    # Apply all pending migrations
    .\migrate.ps1

    # Create initial migrations for all services
    .\migrate.ps1 -Action add -Name InitialCreate

    # Apply only for new WishlistService
    .\migrate.ps1 -Services WishlistService

    # Generate SQL script for OrderService only
    .\migrate.ps1 -Action script -Services OrderService
#>
param(
    [ValidateSet('add','update','remove','script')]
    [string]  $Action   = 'update',

    [string]  $Name     = 'InitialCreate',

    [string[]]$Services = @('UserService','CategoryService','ProductService','CartService','WishlistService','OrderService')
)

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot

# Normalise comma-joined string (e.g. -Services "UserService,WishlistService")
if ($Services.Count -eq 1 -and $Services[0] -match ',') {
    $Services = $Services[0] -split ',' | ForEach-Object { $_.Trim() }
}

function Run-Migration {
    param([string]$Svc)

    $dir = Join-Path $root "services\$Svc"
    if (-not (Test-Path $dir)) {
        Write-Warning "[$Svc] Directory not found: $dir — skipping"
        return
    }

    Write-Host "`n[$Svc] Running: $Action" -ForegroundColor Yellow
    Push-Location $dir
    try {
        switch ($Action) {
            'add' {
                dotnet ef migrations add $Name --output-dir Data/Migrations
                if ($LASTEXITCODE -ne 0) { throw "migrations add failed for $Svc" }
            }
            'update' {
                dotnet ef database update
                if ($LASTEXITCODE -ne 0) { throw "database update failed for $Svc" }
            }
            'remove' {
                dotnet ef migrations remove
                if ($LASTEXITCODE -ne 0) { throw "migrations remove failed for $Svc" }
            }
            'script' {
                $outFile = "Data/Migrations/migration_$(Get-Date -Format 'yyyyMMddHHmm').sql"
                dotnet ef migrations script --idempotent --output $outFile
                if ($LASTEXITCODE -ne 0) { throw "migrations script failed for $Svc" }
                Write-Host "  Script written: $outFile" -ForegroundColor Gray
            }
        }
        Write-Host "  [OK] $Svc" -ForegroundColor Green
    }
    finally {
        Pop-Location
    }
}

Write-Host "`n DevHub Migrations — Action: $Action" -ForegroundColor Cyan
Write-Host " Services: $($Services -join ', ')`n" -ForegroundColor Gray

foreach ($svc in $Services) {
    Run-Migration -Svc $svc
}

Write-Host "`nAll migrations complete.`n" -ForegroundColor Green
