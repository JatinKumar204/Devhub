# DevHub

A multi-vendor eCommerce platform built on an Angular 17+ frontend talking to six .NET 8 microservices over a dynamic service registry. Supports three user roles (Admin, Seller, Buyer) with full RBAC, JWT authentication, image upload, and IIS or Docker deployment.

---

## Architecture

```
devhub/
├── Frontend/                    Angular 17 (standalone components, signals)
│   └── src/app/
│       ├── core/
│       │   ├── guards/          authGuard, roleGuard
│       │   ├── interceptors/    authInterceptor, microserviceRoutingInterceptor
│       │   ├── models/          ecommerce.models.ts
│       │   └── services/        auth, cart, product, order, wishlist, toast
│       └── features/
│           ├── auth/            login, register
│           ├── shop/            home, product-list, product-detail, cart,
│           │                    wishlist, checkout, my-orders
│           ├── dashboard/       Admin + Seller dashboard
│           ├── products/        Seller / Admin product management + image upload
│           ├── orders/          Admin order management
│           └── users/           Admin user management
├── services/
│   ├── UserService/             :3001  Auth, Users, JWT
│   ├── ProductService/          :3002  Products, images (file storage)
│   ├── OrderService/            :3003  Orders
│   ├── CartService/             :3004  Shopping cart
│   ├── WishlistService/         :3005  Wishlists
│   └── CategoryService/         :3006  Categories
├── tests/
│   └── UserService.Tests/       xUnit + Moq + FluentAssertions
├── deploy/
│   ├── iis/                     web.config templates (frontend + services)
│   └── scripts/deploy-iis.ps1  Full IIS deploy script (DEV / QA / PROD)
├── docker-compose.yml
├── DevHub.sln
└── start-local.ps1 / .sh
```

### Service ports

| Environment | Frontend | UserService | ProductService | OrderService | CartService | WishlistService | CategoryService |
|-------------|----------|-------------|----------------|--------------|-------------|-----------------|-----------------|
| DEV         | 8080     | 3001        | 3002           | 3003         | 3004        | 3005            | 3006            |
| QA          | 8081     | 3101        | 3102           | 3103         | 3104        | 3105            | 3106            |
| PROD        | 80       | 5001        | 5002           | 5003         | 5004        | 5005            | 5006            |

---

## Prerequisites

| Tool | Version |
|------|---------|
| .NET SDK | 8.0+ |
| Node.js | 20+ |
| SQL Server | 2019+ (or Docker) |
| IIS + URL Rewrite + ARR | (for IIS deploy) |

---

## Quick Start — Docker

```bash
cp .env.example .env
# Edit .env — set a strong JWT_SECRET (at minimum 32 chars)

docker-compose up --build
# Open http://localhost:8080
```

---

## Quick Start — Native (Windows)

```powershell
# Run PowerShell as Administrator
./start-local.ps1
```

This starts SQL Server in Docker, runs EF migrations for every service, starts all six services in background jobs, and launches the Angular dev server at http://localhost:4200.

---

## Quick Start — Native (Linux / macOS)

```bash
chmod +x start-local.sh migrate.sh
./start-local.sh
```

---

## Environment Variables

Copy `.env.example` to `.env` and set:

| Variable | Description |
|----------|-------------|
| `DB_SA_PASSWORD` | SQL Server SA password |
| `JWT_SECRET` | HMAC-SHA256 key, minimum 32 characters |
| `ASPNETCORE_ENVIRONMENT` | `Development` / `QA` / `Production` |

Never commit `.env` to source control.

---

## EF Core Migrations

Run all pending migrations across every service:

```bash
./migrate.sh update
```

Or per-service:

```bash
cd services/UserService
dotnet ef database update
```

Add a new migration to all services:

```bash
./migrate.sh add "AddProductImages"
```

---

## IIS Deployment

### Prerequisites on the server

1. IIS with the **URL Rewrite** and **Application Request Routing** modules installed
2. .NET 8 Hosting Bundle
3. Node.js 20 (only needed if you want to build on the server)
4. A GitHub Actions self-hosted runner registered and running as a Windows Service

### One-command deploy

Run from the repository root as Administrator:

```powershell
# Full stack to DEV
.\deploy\scripts\deploy-iis.ps1 -Environment DEV

# Frontend + specific services to PROD
.\deploy\scripts\deploy-iis.ps1 -Environment PROD -Services "Frontend,UserService,ProductService"

# Skip build (redeploy _publish output without recompiling)
.\deploy\scripts\deploy-iis.ps1 -Environment PROD -SkipBuild -SkipMigrations
```

### What the deploy script does

1. Builds the Angular frontend with the correct environment config (`--configuration=production`)
2. Runs `dotnet publish` for every selected service (or skips it if `–SkipBuild`)
3. Creates IIS application pools and sites if they don't already exist
4. Stops only the pools being updated, copies files with Robocopy, restarts them
5. Preserves `appsettings.json` on the server so secrets are never overwritten from the repo
6. Runs EF Core migrations unless `–SkipMigrations`

### Manual IIS setup (first time)

If you want to create sites by hand instead of using the deploy script:

```
Site name: DevHub-Frontend
Physical path: C:\inetpub\devhub\Frontend
Binding: *:8080 (DEV) / *:80 (PROD)
web.config: deploy/iis/frontend-web.config

Site name: DevHub-UserService
Physical path: C:\inetpub\devhub\UserService
Binding: *:3001
web.config: deploy/iis/service-web.config
App pool: No managed code, .NET CLR version = No Managed Code
```

Repeat for each service with the port from the table above.

### Product image uploads on IIS

ProductService writes uploaded images to `wwwroot\uploads\products\{id}\` relative to its publish directory. The IIS site for ProductService must have **write permissions** on that folder for the application pool identity:

```powershell
$path = "C:\inetpub\devhub\ProductService\wwwroot\uploads"
New-Item -ItemType Directory -Force -Path $path
$acl = Get-Acl $path
$rule = New-Object System.Security.AccessControl.FileSystemAccessRule(
    "IIS AppPool\DevHub-ProductService", "Modify", "ContainerInherit,ObjectInherit", "None", "Allow")
$acl.SetAccessRule($rule)
Set-Acl $path $acl
```

---

## CI/CD (GitHub Actions)

The pipeline in `.github/workflows/ci-cd.yml` follows a three-stage pattern:

| Stage | Trigger | Tests | Approval gate |
|-------|---------|-------|---------------|
| DEV | Auto on push to `Dev` | Unit tests | — |
| UAT | After DEV passes | Integration tests | QA Lead |
| PROD | After UAT passes | — | Project Manager |

### GitHub Environments setup

1. Go to **Settings → Environments** in your GitHub repo
2. Create environments named `DEV`, `UAT`, `PROD`
3. On `UAT` and `PROD`, add **Required reviewers**
4. Register a self-hosted runner on your Windows server: **Settings → Actions → Runners → New self-hosted runner**

The runner must be able to reach IIS (it runs on the same machine or has SMB access to the deploy root).

---

## User Roles

| Feature | Admin | Seller | Buyer |
|---------|-------|--------|-------|
| View shop | ✅ | ✅ | ✅ |
| View product detail | ✅ | ✅ | ✅ |
| Add to cart | ✗ | ✗ | ✅ |
| Place order | ✗ | ✗ | ✅ |
| Wishlist | ✗ | ✗ | ✅ |
| Add / edit products | ✅ (all) | ✅ (own) | ✗ |
| Delete products | ✅ (all) | ✅ (own) | ✗ |
| Upload product images | ✅ | ✅ (own) | ✗ |
| Manage categories | ✅ | ✗ | ✗ |
| View all orders | ✅ | ✗ | ✗ |
| View own orders | — | ✗ | ✅ |
| View all users | ✅ | ✗ | ✗ |
| Activate / deactivate users | ✅ | ✗ | ✗ |
| Analytics dashboard | ✅ | ✅ (own) | ✗ |

Default login credentials for the seeded database:

| Role | Email | Password |
|------|-------|----------|
| Admin | alice@example.com | Admin@123 |
| Seller | bob@example.com | User@123 |
| Buyer | carol@example.com | User@123 |

---

## Running Tests

```bash
# All tests
dotnet test DevHub.sln

# Single service
cd tests/UserService.Tests
dotnet test --logger "console;verbosity=detailed"
```

---

## Project: Known Issues Fixed

| Issue | Root Cause | Fix |
|-------|-----------|-----|
| Login succeeds but page stays on `/login` | HTTP response handler runs outside Angular's NgZone, signal update doesn't trigger change detection | Wrapped `_router.navigate` in `NgZone.run()` in `LoginComponent` |
| F5 / refresh on any deep route shows blank page | SPA routes not caught by IIS; missing URL rewrite rule | `web.config` rewrite rule catches all non-file, non-directory requests and returns `index.html` |
| Seller lands on 403 after login | `roleGuard(['Admin'])` on `/dashboard` didn't include `Seller` | Added `Seller` to the allowed roles on the dashboard route |
| Sellers could access `/shop/cart` | No role restriction on cart route | Added `roleGuard(['Buyer'])` to cart, wishlist, checkout, orders routes |
| User Management shows "Customer" filter that matches nothing | Filter value was `'Customer'`; backend role is `'Buyer'` | Changed option value to `'Buyer'` |
| Product images return 404 | `UseStaticFiles()` not called in ProductService; `wwwroot` folder not created | Added `app.UseStaticFiles()` and ensured `wwwroot/uploads` is created on upload |
| No multi-image upload | Missing endpoint and repository methods | Added `POST /api/products/{id}/images` and `DeleteImageAsync` |
