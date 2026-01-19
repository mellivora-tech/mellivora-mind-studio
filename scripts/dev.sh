#!/bin/bash
# =============================================================================
# Development Environment Startup Script
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}=== Mellivora Mind Studio Development Environment ===${NC}"

# =============================================================================
# Functions
# =============================================================================

start_infra() {
    echo -e "${YELLOW}Starting infrastructure services...${NC}"
    docker-compose -f "$ROOT_DIR/deploy/docker/docker-compose.yml" up -d
    
    echo -e "${GREEN}Infrastructure started:${NC}"
    echo "  PostgreSQL: localhost:5432 (user: mellivora, pass: mellivora_dev)"
    echo "  Redis:      localhost:6379"
    echo "  NATS:       localhost:4222 (monitoring: localhost:8222)"
    echo "  ClickHouse: localhost:8123 (user: mellivora, pass: mellivora_dev)"
}

stop_infra() {
    echo -e "${YELLOW}Stopping infrastructure services...${NC}"
    docker-compose -f "$ROOT_DIR/deploy/docker/docker-compose.yml" down
}

check_infra() {
    echo -e "${YELLOW}Checking infrastructure status...${NC}"
    
    # PostgreSQL
    if pg_isready -h localhost -p 5432 -U mellivora &> /dev/null; then
        echo -e "  PostgreSQL: ${GREEN}UP${NC}"
    else
        echo -e "  PostgreSQL: ${RED}DOWN${NC}"
    fi
    
    # Redis
    if redis-cli -h localhost -p 6379 ping &> /dev/null; then
        echo -e "  Redis:      ${GREEN}UP${NC}"
    else
        echo -e "  Redis:      ${RED}DOWN${NC}"
    fi
    
    # NATS
    if curl -s http://localhost:8222/healthz &> /dev/null; then
        echo -e "  NATS:       ${GREEN}UP${NC}"
    else
        echo -e "  NATS:       ${RED}DOWN${NC}"
    fi
    
    # ClickHouse
    if curl -s "http://localhost:8123/?query=SELECT%201" &> /dev/null; then
        echo -e "  ClickHouse: ${GREEN}UP${NC}"
    else
        echo -e "  ClickHouse: ${RED}DOWN${NC}"
    fi
}

run_migrations() {
    echo -e "${YELLOW}Running database migrations...${NC}"
    
    # PostgreSQL migrations
    for f in "$ROOT_DIR"/migrations/postgres/*.sql; do
        echo "  Applying: $(basename $f)"
        PGPASSWORD=mellivora_dev psql -h localhost -p 5432 -U mellivora -d mellivora -f "$f" 2>&1 | grep -v "NOTICE"
    done
    
    # ClickHouse migrations
    for f in "$ROOT_DIR"/migrations/clickhouse/*.sql; do
        echo "  Applying: $(basename $f)"
        curl -s "http://localhost:8123/?user=mellivora&password=mellivora_dev" --data-binary "@$f"
    done
    
    echo -e "${GREEN}Migrations complete${NC}"
}

generate_proto() {
    echo -e "${YELLOW}Generating protobuf code...${NC}"
    bash "$ROOT_DIR/scripts/proto-gen.sh" all
}

# =============================================================================
# Main
# =============================================================================

case "${1:-start}" in
    start)
        start_infra
        echo ""
        echo -e "${BLUE}To run migrations: $0 migrate${NC}"
        echo -e "${BLUE}To generate proto: $0 proto${NC}"
        ;;
    stop)
        stop_infra
        ;;
    restart)
        stop_infra
        start_infra
        ;;
    status)
        check_infra
        ;;
    migrate)
        run_migrations
        ;;
    proto)
        generate_proto
        ;;
    full)
        start_infra
        echo ""
        echo -e "${YELLOW}Waiting for services to be ready...${NC}"
        sleep 5
        run_migrations
        generate_proto
        echo ""
        echo -e "${GREEN}Development environment ready!${NC}"
        ;;
    *)
        echo "Usage: $0 [start|stop|restart|status|migrate|proto|full]"
        echo ""
        echo "Commands:"
        echo "  start   - Start infrastructure (PostgreSQL, Redis, NATS, ClickHouse)"
        echo "  stop    - Stop infrastructure"
        echo "  restart - Restart infrastructure"
        echo "  status  - Check infrastructure status"
        echo "  migrate - Run database migrations"
        echo "  proto   - Generate protobuf code"
        echo "  full    - Start infra + migrate + proto"
        exit 1
        ;;
esac
