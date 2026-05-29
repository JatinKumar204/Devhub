#!/usr/bin/env bash
# start-local.sh — DevHub local development launcher
#
# Dynamic mode (default): services self-allocate ports starting at their base port.
#   Use the /config page "Discover" button to find actual ports.
#
# Static mode (--static-ports): passes PORT= env var so services use fixed ports.
#   Same behaviour as the original script.
#
# Usage:
#   ./start-local.sh                   # dynamic, all services
#   ./start-local.sh --static-ports    # static ports
#   ./start-local.sh users products    # specific services (dynamic)
#   ./start-local.sh --static-ports users products  # specific services (static)

set -euo pipefail

MACHINE_NAME="${DEVHUB_MACHINE:-$(hostname)}"
ROOT="$(cd "$(dirname "$0")" && pwd)"
STATIC_PORTS=false

# Parse flags
SERVICES=()
for arg in "$@"; do
    case "$arg" in
        --static-ports) STATIC_PORTS=true ;;
        --*) echo "Unknown flag: $arg" && exit 1 ;;
        *)   SERVICES+=("$arg") ;;
    esac
done

# Default: all services
if [ ${#SERVICES[@]} -eq 0 ]; then
    SERVICES=(users products orders cart wishlist categories frontend)
fi

echo -e "\n⚡ DevHub Local Dev Startup"
echo "   Machine : $MACHINE_NAME"
echo "   Mode    : $([ "$STATIC_PORTS" = true ] && echo 'Static ports' || echo 'Dynamic port allocation')"
echo ""

# ─── SQL Server via Docker ────────────────────────────────────────────────────
if ! docker ps --filter "name=devhub_sqlserver" --format "{{.Names}}" | grep -q devhub_sqlserver 2>/dev/null; then
    echo "[SQL] Starting SQL Server container..."
    docker run -d --name devhub_sqlserver \
        -e ACCEPT_EULA=Y \
        -e SA_PASSWORD='DevHub@2025!' \
        -p 1433:1433 \
        mcr.microsoft.com/mssql/server:2022-latest > /dev/null
    echo "  Waiting 15s for SQL to initialize..."
    sleep 15
else
    echo "[SQL] SQL Server already running"
fi

# ─── Service launcher ─────────────────────────────────────────────────────────
declare -A SERVICE_DIRS
SERVICE_DIRS[users]="services/UserService"
SERVICE_DIRS[products]="services/ProductService"
SERVICE_DIRS[orders]="services/OrderService"
SERVICE_DIRS[cart]="services/CartService"
SERVICE_DIRS[wishlist]="services/WishlistService"
SERVICE_DIRS[categories]="services/CategoryService"

declare -A BASE_PORTS
BASE_PORTS[users]=3001
BASE_PORTS[products]=3002
BASE_PORTS[orders]=3003
BASE_PORTS[cart]=3004
BASE_PORTS[wishlist]=3005
BASE_PORTS[categories]=3006

for svc in "${SERVICES[@]}"; do
    if [ "$svc" = "frontend" ]; then
        continue
    fi

    if [ -z "${SERVICE_DIRS[$svc]+x}" ]; then
        echo "  WARNING: Unknown service '$svc' — skipping"
        continue
    fi

    dir="$ROOT/${SERVICE_DIRS[$svc]}"
    base_port="${BASE_PORTS[$svc]}"

    if [ ! -d "$dir" ]; then
        echo "  WARNING: Directory not found: $dir — skipping $svc"
        continue
    fi

    if [ "$STATIC_PORTS" = true ]; then
        echo "  Starting $svc on :$base_port (static)..."
        PORT=$base_port ASPNETCORE_ENVIRONMENT=Development dotnet run --project "$dir" &
    else
        echo "  Starting $svc (dynamic, base port $base_port)..."
        # No PORT env var — DynamicPort.Resolve() handles allocation
        ASPNETCORE_ENVIRONMENT=Development dotnet run --project "$dir" &
    fi

    echo "    PID $! — $svc"
done

# ─── Angular frontend ─────────────────────────────────────────────────────────
if printf '%s\n' "${SERVICES[@]}" | grep -q '^frontend$'; then
    echo "  Starting Angular frontend on :4200..."
    (cd "$ROOT/Frontend" && DEVHUB_MACHINE="$MACHINE_NAME" npx ng serve --host 0.0.0.0 --port 4200) &
    echo "    PID $! — Frontend"
fi

# ─── Summary ─────────────────────────────────────────────────────────────────
echo ""
echo "All services started."
echo ""
echo "  Frontend : http://localhost:4200"
echo ""

if [ "$STATIC_PORTS" = true ]; then
    echo "  Fixed ports:"
    for svc in users products orders cart wishlist categories; do
        if printf '%s\n' "${SERVICES[@]}" | grep -q "^${svc}$"; then
            echo "    $svc: http://localhost:${BASE_PORTS[$svc]}/api/health"
        fi
    done
else
    echo "  Dynamic ports — find actual ports via:"
    echo "    Config page : http://localhost:4200/config → click Discover"
    echo "    Probe any   : http://localhost:3001/api/registry"
    echo "    Base ports  : users=3001 products=3002 orders=3003 cart=3004 wishlist=3005 categories=3006"
fi

echo ""
echo "Press Ctrl+C to stop all services"

wait
