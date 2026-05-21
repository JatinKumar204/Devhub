#!/usr/bin/env bash
# Run EF Core migrations for all services
# Usage: ./migrate.sh [add "MigrationName" | update | remove | script]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
ACTION="${1:-update}"
MIGRATION_NAME="${2:-}"

export ASPNETCORE_ENVIRONMENT="${ASPNETCORE_ENVIRONMENT:-Development}"

run_migration() {
    local svc="$1"
    local dir="$ROOT/services/$svc"
    echo "[$svc] $ACTION..."
    case "$ACTION" in
        add)
            dotnet ef migrations add "${MIGRATION_NAME:-InitialCreate}" \
                --project "$dir" \
                --output-dir Data/Migrations
            ;;
        update)
            dotnet ef database update --project "$dir"
            ;;
        remove)
            dotnet ef migrations remove --project "$dir"
            ;;
        script)
            dotnet ef migrations script \
                --project "$dir" \
                --output "$dir/Data/Migrations/migration.sql"
            ;;
        *)
            echo "Unknown action: $ACTION. Use: add | update | remove | script"
            exit 1
            ;;
    esac
    echo "  [OK] $svc done"
}

run_migration "UserService"
run_migration "ProductService"
run_migration "OrderService"

echo ""
echo "All migrations complete."
