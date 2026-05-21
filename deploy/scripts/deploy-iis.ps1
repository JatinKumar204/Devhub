<#
.SYNOPSIS
    DevHub IIS Deployment Script - Full Stack (all 6 microservices + Angular frontend)

.DESCRIPTION
    Builds and deploys the Angular frontend and all .NET microservices to IIS.
    Handles services that are already deployed and running on IIS safely:
      - Stops only the specific site/app-pool being updated
      - Preserves appsettings.json on the server (does NOT overwrite with build output)
      - Copies only changed files using Robocopy with exclusions
      - Restarts only the sites that were actually stopped

    Must be run as Administrator from the repository root.

.PARAMETER Environment
    Target environment: DEV, QA, or PROD

.PARAMETER SiteName
    Base IIS site name prefix (default: DevHub)

.PARAMETER DeployRoot
    Root folder where published artifacts live on the server (default: C:\inetpub\devhub)

.PARAMETER Services
    Comma-separated list of services to deploy. Default is all.
    Valid values: Frontend, UserService, ProductService, OrderService,
                  CartService, CategoryService, WishlistService
    Example: -Services "UserService,ProductService"

.PARAMETER SkipBuild
    Skip dotnet publish / ng build and redeploy the existing _publish output as-is.

.PARAMETER SkipMigrations
    Skip running EF Core database migrations after deploy.

.EXAMPLE
    .\deploy-iis.ps1 -Environment DEV
    .\deploy-iis.ps1 -Environment PROD -Services "Frontend,UserService,ProductService,OrderService"
    .\deploy-iis.ps1 -Environment PROD -Services "WishlistService"
    .\deploy-iis.ps1 -Environment PROD -Services "UserService" -SkipBuild -SkipMigrations
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [ValidateSet('DEV', 'QA', 'PROD')]
    [string]$Environment,

    [string]  $SiteName       = 'DevHub',
    [string]  $DeployRoot     = 'C:\inetpub\devhub',
    [string[]]$Services       = @('Frontend','UserService','ProductService','OrderService','CartService','CategoryService','WishlistService'),
    [switch]  $SkipBuild,
    [switch]  $SkipMigrations
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# Normalise -Services "UserService,ProductService" passed as one comma-joined string
if ($Services.Count -eq 1 -and $Services[0] -match ',') {
    $Services = $Services[0] -split ',' | ForEach-Object { $_.Trim() }
}

# ---------------------------------------------------------------------------
# Port / environment maps
# ---------------------------------------------------------------------------
$PortMap = @{
    DEV  = @{ Frontend = 8080; UserService = 3001; ProductService = 3002; OrderService = 3003; CartService = 3004; WishlistService = 3005; CategoryService = 3006 }
    QA   = @{ Frontend = 8081; UserService = 3101; ProductService = 3102; OrderService = 3103; CartService = 3104; WishlistService = 3105; CategoryService = 3106 }
    PROD = @{ Frontend = 80;   UserService = 5001; ProductService = 5002; OrderService = 5003; CartService = 5004; WishlistService = 5005; CategoryService = 5006 }
}
$Ports  = $PortMap[$Environment]
$NetEnv = @{ DEV = 'Development'; QA = 'QA'; PROD = 'Production' }[$Environment]
$NgEnv  = @{ DEV = 'development'; QA = 'qa'; PROD = 'production'  }[$Environment]

# ---------------------------------------------------------------------------
# Service metadata
# ---------------------------------------------------------------------------
$ServiceDefs = [ordered]@{
    UserService     = @{ Proj = 'services\UserService\UserService.csproj';         Pub = '_publish\UserService';     Deploy = 'UserService';     PortKey = 'UserService'     }
    ProductService  = @{ Proj = 'services\ProductService\ProductService.csproj';   Pub = '_publish\ProductService';  Deploy = 'ProductService';  PortKey = 'ProductService'  }
    OrderService    = @{ Proj = 'services\OrderService\OrderService.csproj';       Pub = '_publish\OrderService';    Deploy = 'OrderService';    PortKey = 'OrderService'    }
    CartService     = @{ Proj = 'services\CartService\CartService.csproj';         Pub = '_publish\CartService';     Deploy = 'CartService';     PortKey = 'CartService'     }
    WishlistService = @{ Proj = 'services\WishlistService\WishlistService.csproj'; Pub = '_publish\WishlistService'; Deploy = 'WishlistService'; PortKey = 'WishlistService' }
    CategoryService = @{ Proj = 'services\CategoryService\CategoryService.csproj'; Pub = '_publish\CategoryService'; Deploy = 'CategoryService'; PortKey = 'CategoryService' }
}

# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------

function Write-Step { param([string]$Msg) Write-Host ""; Write-Host $Msg -ForegroundColor Yellow }
function Write-OK   { param([string]$Msg) Write-Host "  [OK] $Msg" -ForegroundColor Green }
function Write-Info { param([string]$Msg) Write-Host "       $Msg" -ForegroundColor Gray  }

function Ensure-AppPool {
    param([string]$Name)
    if (-not (Test-Path "IIS:\AppPools\$Name")) {
        New-WebAppPool -Name $Name | Out-Null
        Set-ItemProperty "IIS:\AppPools\$Name" -Name managedRuntimeVersion -Value ''
        Set-ItemProperty "IIS:\AppPools\$Name" -Name processModel.identityType -Value 'ApplicationPoolIdentity'
        Write-OK "Created app pool: $Name"
    }
    else {
        Write-Info "App pool exists: $Name"
    }
}

function Ensure-Site {
    param([string]$Name, [string]$PhysicalPath, [int]$Port, [string]$AppPool)
    if (-not (Test-Path $PhysicalPath)) {
        New-Item -ItemType Directory -Path $PhysicalPath -Force | Out-Null
    }
    $existing = Get-Website -Name $Name -ErrorAction SilentlyContinue
    if ($null -eq $existing) {
        New-Website -Name $Name -PhysicalPath $PhysicalPath -Port $Port -ApplicationPool $AppPool | Out-Null
        Write-OK "Created IIS site: $Name on port $Port"
    }
    else {
        Set-ItemProperty "IIS:\Sites\$Name" -Name physicalPath -Value $PhysicalPath
        Write-Info "IIS site exists: $Name (port unchanged)"
    }
}

function Stop-SiteAndPool {
    param([string]$SiteName, [string]$PoolName)
    $site = Get-Website -Name $SiteName -ErrorAction SilentlyContinue
    if ($null -ne $site -and $site.State -eq 'Started') {
        Stop-Website -Name $SiteName -ErrorAction SilentlyContinue
        Write-Info "Stopped site: $SiteName"
    }
    $pool = Get-WebAppPoolState -Name $PoolName -ErrorAction SilentlyContinue
    if ($null -ne $pool -and $pool.Value -eq 'Started') {
        Stop-WebAppPool -Name $PoolName -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 3
        Write-Info "Stopped pool: $PoolName"
    }
}

function Start-SiteAndPool {
    param([string]$SiteName, [string]$PoolName)
    Start-WebAppPool -Name $PoolName -ErrorAction SilentlyContinue
    Start-Website    -Name $SiteName -ErrorAction SilentlyContinue
    Write-OK "Started: $SiteName"
}

function Write-WebConfig {
    param([string]$TargetDir, [string]$DllName, [string]$AspNetCoreEnv)
    $lines = @(
        '<?xml version="1.0" encoding="utf-8"?>',
        '<configuration>',
        '  <system.webServer>',
        '    <handlers>',
        '      <add name="aspNetCore" path="*" verb="*" modules="AspNetCoreModuleV2" resourceType="Unspecified" />',
        '    </handlers>',
        "    <aspNetCore processPath=""dotnet""",
        "                arguments="".\$DllName.dll""",
        '                stdoutLogEnabled="false"',
        '                stdoutLogFile=".\logs\stdout"',
        '                hostingModel="inprocess">',
        '      <environmentVariables>',
        "        <environmentVariable name=""ASPNETCORE_ENVIRONMENT"" value=""$AspNetCoreEnv"" />",
        '      </environmentVariables>',
        '    </aspNetCore>',
        '  </system.webServer>',
        '</configuration>'
    )
    $wcPath = Join-Path $TargetDir 'web.config'
    Set-Content -Path $wcPath -Value ($lines -join "`r`n") -Encoding UTF8
    Write-Info "web.config written: $wcPath"
}

function Robocopy-Safe {
    param([string]$Source, [string]$Dest, [bool]$ExcludeAppSettings = $true)

    $flags = @('/E', '/NFL', '/NDL', '/NJH', '/NJS', '/NP', '/R:2', '/W:3')

    if ($ExcludeAppSettings) {
        $xfFiles = @()
        foreach ($f in @('appsettings.json','appsettings.Development.json','appsettings.Production.json','appsettings.QA.json')) {
            if (Test-Path (Join-Path $Dest $f)) { $xfFiles += $f }
        }
        if ($xfFiles.Count -gt 0) {
            $flags += '/XF'
            $flags += $xfFiles
            Write-Info "Preserving server appsettings: $($xfFiles -join ', ')"
        }
    }

    robocopy $Source $Dest @flags
    $rc = $LASTEXITCODE
    if ($rc -ge 8) { throw "Robocopy failed: $Source -> $Dest (exit code $rc)" }
}

function Run-EfMigrations {
    param([string]$ServiceDir)
    Write-Info "Running EF migrations: $ServiceDir"
    Push-Location $ServiceDir
    try {
        dotnet ef database update --no-build
        if ($LASTEXITCODE -ne 0) { throw "EF migrations failed for $ServiceDir" }
        Write-OK "Migrations applied: $ServiceDir"
    }
    finally { Pop-Location }
}

# ---------------------------------------------------------------------------
# Pre-flight checks
# ---------------------------------------------------------------------------

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  DevHub IIS Deployment  -  $Environment" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

Import-Module WebAdministration -ErrorAction Stop

$currentPrincipal = [Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()
if (-not $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw 'This script must be run as Administrator.'
}

if (-not (Test-Path "$env:ProgramFiles\dotnet\dotnet.exe")) {
    throw 'dotnet.exe not found. Install the ASP.NET Core Hosting Bundle before deploying.'
}

# Script lives in deploy\scripts\ so repo root is two levels up
$repoRoot = (Get-Item $PSScriptRoot).Parent.Parent.FullName
Write-Info "Repo root   : $repoRoot"
Write-Info "Deploy root : $DeployRoot"
Write-Info "Site prefix : $SiteName"
Write-Info "Services    : $($Services -join ', ')"
Write-Info "Skip build  : $SkipBuild"
Write-Host ""

if (-not (Test-Path (Join-Path $repoRoot 'Frontend\package.json'))) {
    throw "Frontend\package.json not found under $repoRoot"
}

# ---------------------------------------------------------------------------
# [1] Build Angular
# ---------------------------------------------------------------------------

if ($Services -contains 'Frontend') {
    Write-Step "[1] Building Angular frontend..."

    if ($SkipBuild) {
        Write-Info "SkipBuild set - using existing _publish\frontend"
    }
    else {
        Push-Location (Join-Path $repoRoot 'Frontend')
        try {
            Write-Info "npm ci..."
            npm ci --silent
            if ($LASTEXITCODE -ne 0) { throw 'npm ci failed.' }

            Write-Info "ng build --configuration=$NgEnv ..."
            npx ng build --configuration=$NgEnv --output-path="..\\_publish\\frontend"
            if ($LASTEXITCODE -ne 0) { throw 'ng build failed.' }
        }
        finally { Pop-Location }
        Write-OK "Angular build complete"
    }
}

# ---------------------------------------------------------------------------
# [2] Publish .NET services
# ---------------------------------------------------------------------------

$dotnetServices = @($Services | Where-Object { $_ -ne 'Frontend' })

if ($dotnetServices.Count -gt 0) {
    Write-Step "[2] Publishing .NET services..."

    foreach ($svc in $dotnetServices) {
        if (-not $ServiceDefs.Contains($svc)) {
            Write-Warning "Unknown service '$svc' - skipping"
            continue
        }
        if ($SkipBuild) {
            Write-Info "SkipBuild set - skipping publish for $svc"
            continue
        }

        $def      = $ServiceDefs[$svc]
        $projPath = Join-Path $repoRoot $def.Proj
        $outPath  = Join-Path $repoRoot $def.Pub

        if (-not (Test-Path $projPath)) { throw "Project not found: $projPath" }

        Write-Info "Publishing $svc ..."
        dotnet publish $projPath -c Release -o $outPath /p:EnvironmentName=$NetEnv /p:UseAppHost=false --nologo -v minimal
        if ($LASTEXITCODE -ne 0) { throw "dotnet publish failed for $svc" }
        Write-OK "Published: $svc"
    }
}

# ---------------------------------------------------------------------------
# [3] Ensure IIS app pools and sites
# ---------------------------------------------------------------------------

Write-Step "[3] Configuring IIS app pools and sites..."

if ($Services -contains 'Frontend') {
    Ensure-AppPool -Name "$SiteName-Frontend"
    Ensure-Site -Name "$SiteName-Frontend" -PhysicalPath "$DeployRoot\frontend" -Port $Ports.Frontend -AppPool "$SiteName-Frontend"
}

foreach ($svc in $dotnetServices) {
    if (-not $ServiceDefs.Contains($svc)) { continue }
    $def = $ServiceDefs[$svc]
    Ensure-AppPool -Name "$SiteName-$svc"
    Ensure-Site -Name "$SiteName-$svc" -PhysicalPath "$DeployRoot\$($def.Deploy)" -Port $Ports[$def.PortKey] -AppPool "$SiteName-$svc"
}

# ---------------------------------------------------------------------------
# [4] Stop -> copy files -> start   (one service at a time)
# ---------------------------------------------------------------------------

Write-Step "[4] Deploying files..."

if ($Services -contains 'Frontend') {
    $fSite = "$SiteName-Frontend"
    $fPool = "$SiteName-Frontend"
    $fSrc  = Join-Path $repoRoot '_publish\frontend'
    $fDst  = "$DeployRoot\frontend"

    Stop-SiteAndPool -SiteName $fSite -PoolName $fPool

    robocopy $fSrc $fDst /MIR /NFL /NDL /NJH /NJS /NP /R:2 /W:3
    if ($LASTEXITCODE -ge 8) { throw "Robocopy failed for Frontend (exit code $LASTEXITCODE)" }
    Write-OK "Copied: Frontend"

    $indexPath = "$fDst\browser\index.html"
    if (Test-Path $indexPath) {
        (Get-Content $indexPath -Raw) -replace 'DEVHUB_MACHINE_PLACEHOLDER', $env:COMPUTERNAME |
            Set-Content $indexPath -Encoding UTF8
        Write-Info "Injected machine name: $env:COMPUTERNAME"
    }

    Start-SiteAndPool -SiteName $fSite -PoolName $fPool
}

foreach ($svc in $dotnetServices) {
    if (-not $ServiceDefs.Contains($svc)) { continue }

    $def      = $ServiceDefs[$svc]
    $siteName = "$SiteName-$svc"
    $poolName = "$SiteName-$svc"
    $src      = Join-Path $repoRoot $def.Pub
    $dst      = "$DeployRoot\$($def.Deploy)"

    Stop-SiteAndPool -SiteName $siteName -PoolName $poolName

    Robocopy-Safe -Source $src -Dest $dst -ExcludeAppSettings $true
    Write-OK "Copied: $svc"

    $logsDir = Join-Path $dst 'logs'
    if (-not (Test-Path $logsDir)) { New-Item -ItemType Directory -Path $logsDir -Force | Out-Null }

    $dllFile = Get-ChildItem $dst -Filter '*.dll' |
               Where-Object { $_.Name -notmatch '^(System|Microsoft|runtime)\.' } |
               Sort-Object LastWriteTime -Descending |
               Select-Object -First 1
    if ($null -eq $dllFile) { throw "Could not find main DLL in $dst" }
    $dllName = [System.IO.Path]::GetFileNameWithoutExtension($dllFile.Name)

    Write-WebConfig -TargetDir $dst -DllName $dllName -AspNetCoreEnv $NetEnv

    Start-SiteAndPool -SiteName $siteName -PoolName $poolName
}

# ---------------------------------------------------------------------------
# [5] EF Migrations
# ---------------------------------------------------------------------------

if (-not $SkipMigrations -and $dotnetServices.Count -gt 0) {
    Write-Step "[5] Running EF Core migrations..."

    $migrationOrder = @('UserService','CategoryService','ProductService','CartService','WishlistService','OrderService')
    foreach ($svc in $migrationOrder) {
        if ($dotnetServices -contains $svc -and $ServiceDefs.Contains($svc)) {
            $svcDir = Join-Path $repoRoot "services\$svc"
            if (Test-Path $svcDir) { Run-EfMigrations -ServiceDir $svcDir }
        }
    }
}

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------

Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "  Deployment complete" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""

if ($Services -contains 'Frontend') {
    Write-Host "  Frontend           : http://localhost:$($Ports.Frontend)" -ForegroundColor White
}

foreach ($svc in $dotnetServices) {
    if (-not $ServiceDefs.Contains($svc)) { continue }
    $port   = $Ports[$ServiceDefs[$svc].PortKey]
    $padded = $svc.PadRight(18)
    Write-Host "  $padded : http://localhost:$port/api/health" -ForegroundColor White
}

Write-Host ""
