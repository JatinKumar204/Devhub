#!/usr/bin/env bash
set -euo pipefail

MACHINE_NAME="${DEVHUB_MACHINE:-$(hostname)}"
ROOT="$(cd "$(dirname "$0")" && pwd)"

echo -e "\n⚡ DevHub Local Dev Startup"
echo "Machine: $MACHINE_NAME"
echo ""

start_service() {
    local name="$1"
    local dir="$2"
    local port="$3"

    echo "  Starting $name on :$port..."
    PORT=$port ASPNETCORE_ENVIRONMENT=Development dotnet run --project "$dir" &
    echo "    PID $! — $name"
}

# SQL Server via Docker
if ! docker ps --filter "name=devhub_sqlserver" --format "{{.Names}}" | grep -q devhub_sqlserver; then
    echo "[1/5] Starting SQL Server via Docker..."
    docker run -d --name devhub_sqlserver \
        -e ACCEPT_EULA=Y \
        -e SA_PASSWORD='DevHub@2025!' \
        -p 1433:1433 \
        mcr.microsoft.com/mssql/server:2022-latest > /dev/null
    echo "  Waiting for SQL Server to initialize (15s)..."
    sleep 15
else
    echo "[1/5] SQL Server already running"
fi

echo "[2/5] Starting UserService..."
start_service "UserService" "$ROOT/services/UserService" 3001

echo "[3/5] Starting ProductService..."
start_service "ProductService" "$ROOT/services/ProductService" 3002

echo "[4/5] Starting OrderService..."
start_service "OrderService" "$ROOT/services/OrderService" 3003

echo "[5/5] Starting Angular frontend..."
(cd "$ROOT/frontend" && DEVHUB_MACHINE="$MACHINE_NAME" npx ng serve --host 0.0.0.0 --port 4200) &
echo "    PID $! — Frontend"

echo ""
echo "All services started:"
echo "  Frontend:        http://localhost:4200"
echo "  User Service:    http://localhost:3001/api/health"
echo "  Product Service: http://localhost:3002/api/health"
echo "  Order Service:   http://localhost:3003/api/health"
echo "  Config page:     http://localhost:4200/config"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for all background processes
wait
