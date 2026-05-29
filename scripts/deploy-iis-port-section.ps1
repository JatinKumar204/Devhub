# ─────────────────────────────────────────────────────────────────────────────
# deploy-iis.ps1 — PORT MAP SECTION (replace existing $PortMap block)
#
# IIS deployment always uses static ports via the PORT env var set per-service.
# DynamicPort.Resolve() sees the PORT env var and uses it directly — no scanning.
# This is exactly the same behaviour as before; the dynamic allocator is
# transparent when PORT is explicitly set.
#
# DO NOT remove the PORT env var from IIS site configuration. That's what tells
# each service "you're deployed, use this exact port."
# ─────────────────────────────────────────────────────────────────────────────

# Port / environment maps — UNCHANGED from original
$PortMap = @{
    DEV  = @{ Frontend = 8080; UserService = 3001; ProductService = 3002; OrderService = 3003; CartService = 3004; WishlistService = 3005; CategoryService = 3006 }
    QA   = @{ Frontend = 8081; UserService = 3101; ProductService = 3102; OrderService = 3103; CartService = 3104; WishlistService = 3105; CategoryService = 3106 }
    PROD = @{ Frontend = 80;   UserService = 5001; ProductService = 5002; OrderService = 5003; CartService = 5004; WishlistService = 5005; CategoryService = 5006 }
}

# Each service needs PORT set as an environment variable in its IIS app pool.
# This is already handled by the Ensure-AppPool section further down in the script.
# Verify that Set-ItemProperty "IIS:\AppPools\...\environmentVariables" includes PORT.
#
# Example (already in the script):
#   $env:PORT = $Ports[$def.PortKey]   ← this is what locks each IIS service to a static port
