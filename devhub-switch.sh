#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────
#  devhub-switch.sh
#
#  Helper script to start/stop individual service containers so
#  you can seamlessly switch between local code and Docker containers
#  for any given microservice.
#
#  Usage:
#    ./devhub-switch.sh local   users           # Stop users container → run local
#    ./devhub-switch.sh docker  users           # Start users container → use Docker
#    ./devhub-switch.sh local   users products  # Stop multiple containers
#    ./devhub-switch.sh status                  # Show current routing state
#    ./devhub-switch.sh up                      # Start all containers (full Docker mode)
#    ./devhub-switch.sh down                    # Stop all containers
#
#  Service IDs: users | products | orders
# ─────────────────────────────────────────────────────────────────

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

declare -A SERVICE_CONTAINERS=(
  ["users"]="devhub_user_service"
  ["products"]="devhub_product_service"
  ["orders"]="devhub_order_service"
)

declare -A SERVICE_PORTS=(
  ["users"]="3001"
  ["products"]="3002"
  ["orders"]="3003"
)

declare -A SERVICE_COMPOSE=(
  ["users"]="user-service"
  ["products"]="product-service"
  ["orders"]="order-service"
)

print_header() {
  echo -e ""
  echo -e "${CYAN}${BOLD}  ██████╗ ███████╗██╗   ██╗██╗  ██╗██╗   ██╗██████╗${NC}"
  echo -e "${CYAN}${BOLD}  ██╔══██╗██╔════╝██║   ██║██║  ██║██║   ██║██╔══██╗${NC}"
  echo -e "${CYAN}${BOLD}  ██║  ██║█████╗  ██║   ██║███████║██║   ██║██████╔╝${NC}"
  echo -e "${CYAN}${BOLD}  ██║  ██║██╔══╝  ╚██╗ ██╔╝██╔══██║██║   ██║██╔══██╗${NC}"
  echo -e "${CYAN}${BOLD}  ██████╔╝███████╗ ╚████╔╝ ██║  ██║╚██████╔╝██████╔╝${NC}"
  echo -e "${NC}"
  echo -e "  ${YELLOW}Local ↔ Docker Service Switcher${NC}"
  echo -e ""
}

show_status() {
  echo -e "${BOLD}  Service Routing Status${NC}"
  echo -e "  ─────────────────────────────────────────"
  for id in users products orders; do
    container="${SERVICE_CONTAINERS[$id]}"
    port="${SERVICE_PORTS[$id]}"
    running=$(docker inspect --format='{{.State.Running}}' "$container" 2>/dev/null || echo "false")
    if [ "$running" = "true" ]; then
      echo -e "  ${GREEN}●${NC} ${BOLD}$id${NC} — Docker container running (port $port)"
    else
      # Check if local process is on the port
      pid=$(lsof -ti tcp:"$port" 2>/dev/null || true)
      if [ -n "$pid" ]; then
        echo -e "  ${YELLOW}◆${NC} ${BOLD}$id${NC} — Local process on port $port (PID: $pid)"
      else
        echo -e "  ${RED}○${NC} ${BOLD}$id${NC} — Nothing on port $port"
      fi
    fi
  done
  echo -e "  ─────────────────────────────────────────"
}

switch_to_local() {
  local id="$1"
  local container="${SERVICE_CONTAINERS[$id]}"
  local port="${SERVICE_PORTS[$id]}"

  if [ -z "$container" ]; then
    echo -e "${RED}  ✗ Unknown service: $id${NC}"
    return 1
  fi

  echo -e "${YELLOW}  → Switching '$id' to LOCAL mode...${NC}"

  # Stop and remove the Docker container if running
  if docker inspect "$container" &>/dev/null; then
    docker stop "$container" 2>/dev/null && echo -e "${GREEN}  ✓ Container '$container' stopped${NC}"
    docker rm "$container" 2>/dev/null || true
  else
    echo -e "  (Container '$container' not running)"
  fi

  echo -e "${GREEN}  ✓ '$id' port $port is now free for local development${NC}"
  echo -e "  ${CYAN}  Run your local $id service on port $port${NC}"
  echo -e "  ${CYAN}  Then open DevHub UI and enter: $(hostname): $port${NC}"
}

switch_to_docker() {
  local id="$1"
  local compose_name="${SERVICE_COMPOSE[$id]}"
  local port="${SERVICE_PORTS[$id]}"

  if [ -z "$compose_name" ]; then
    echo -e "${RED}  ✗ Unknown service: $id${NC}"
    return 1
  fi

  echo -e "${YELLOW}  → Switching '$id' to DOCKER mode...${NC}"

  # Kill any local process using the port
  local pid
  pid=$(lsof -ti tcp:"$port" 2>/dev/null || true)
  if [ -n "$pid" ]; then
    echo -e "${YELLOW}  Stopping local process on port $port (PID: $pid)...${NC}"
    kill "$pid" 2>/dev/null || true
    sleep 1
  fi

  # Start the Docker container
  docker-compose up -d "$compose_name"
  echo -e "${GREEN}  ✓ '$id' Docker container started on port $port${NC}"
}

# ── Main ─────────────────────────────────────────────────────────
print_header

COMMAND="${1:-status}"

case "$COMMAND" in
  status)
    show_status
    ;;
  local)
    shift
    if [ $# -eq 0 ]; then
      echo -e "${RED}  Usage: $0 local <service-id> [service-id...]${NC}"
      exit 1
    fi
    for id in "$@"; do
      switch_to_local "$id"
    done
    echo ""
    show_status
    ;;
  docker)
    shift
    if [ $# -eq 0 ]; then
      echo -e "${RED}  Usage: $0 docker <service-id> [service-id...]${NC}"
      exit 1
    fi
    for id in "$@"; do
      switch_to_docker "$id"
    done
    echo ""
    show_status
    ;;
  up)
    echo -e "${YELLOW}  → Starting all DevHub containers...${NC}"
    docker-compose up -d
    echo ""
    show_status
    ;;
  down)
    echo -e "${YELLOW}  → Stopping all DevHub containers...${NC}"
    docker-compose down
    echo -e "${GREEN}  ✓ All containers stopped${NC}"
    ;;
  *)
    echo -e "${RED}  Unknown command: $COMMAND${NC}"
    echo -e "  Usage: $0 [local|docker|status|up|down] [service-ids...]"
    exit 1
    ;;
esac
