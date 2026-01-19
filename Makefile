.PHONY: all proto build test dev clean help

# =============================================================================
# Variables
# =============================================================================

PROTO_DIR := proto
GEN_GO_DIR := gen/go
GEN_PYTHON_DIR := gen/python
GEN_RUST_DIR := gen/rust
GEN_TS_DIR := gen/typescript

# Services
GO_SERVICES := gateway services/account services/order services/position services/trade services/data services/schedule services/config services/alert
PYTHON_SERVICES := compute/risk compute/signal compute/optimize compute/backtest compute/attribution
RUST_CRATES := core/risk-engine core/market-data core/optimizer-core core/covariance
NODE_SERVICES := agents/plugin-agent agents/data-agent agents/trade-agent agents/monitor-agent

# =============================================================================
# Proto Generation
# =============================================================================

proto: proto-go proto-python proto-rust proto-ts ## Generate protobuf code for all languages

proto-go: ## Generate Go protobuf code
	@echo "Generating Go protobuf code..."
	@mkdir -p $(GEN_GO_DIR)
	@protoc --proto_path=$(PROTO_DIR) \
		--go_out=$(GEN_GO_DIR) --go_opt=paths=source_relative \
		--go-grpc_out=$(GEN_GO_DIR) --go-grpc_opt=paths=source_relative \
		$(PROTO_DIR)/common/*.proto \
		$(PROTO_DIR)/account/*.proto \
		$(PROTO_DIR)/order/*.proto \
		$(PROTO_DIR)/position/*.proto \
		$(PROTO_DIR)/trade/*.proto \
		$(PROTO_DIR)/risk/*.proto \
		$(PROTO_DIR)/signal/*.proto \
		$(PROTO_DIR)/data/*.proto

proto-python: ## Generate Python protobuf code
	@echo "Generating Python protobuf code..."
	@mkdir -p $(GEN_PYTHON_DIR)
	@python -m grpc_tools.protoc --proto_path=$(PROTO_DIR) \
		--python_out=$(GEN_PYTHON_DIR) \
		--grpc_python_out=$(GEN_PYTHON_DIR) \
		--pyi_out=$(GEN_PYTHON_DIR) \
		$(PROTO_DIR)/common/*.proto \
		$(PROTO_DIR)/account/*.proto \
		$(PROTO_DIR)/order/*.proto \
		$(PROTO_DIR)/position/*.proto \
		$(PROTO_DIR)/trade/*.proto \
		$(PROTO_DIR)/risk/*.proto \
		$(PROTO_DIR)/signal/*.proto \
		$(PROTO_DIR)/data/*.proto

proto-rust: ## Generate Rust protobuf code
	@echo "Generating Rust protobuf code..."
	@echo "TODO: Add Rust proto generation (use tonic-build)"

proto-ts: ## Generate TypeScript protobuf code
	@echo "Generating TypeScript protobuf code..."
	@mkdir -p $(GEN_TS_DIR)
	@protoc --proto_path=$(PROTO_DIR) \
		--plugin=protoc-gen-ts=./node_modules/.bin/protoc-gen-ts \
		--ts_out=$(GEN_TS_DIR) \
		$(PROTO_DIR)/common/*.proto \
		$(PROTO_DIR)/account/*.proto \
		$(PROTO_DIR)/order/*.proto \
		$(PROTO_DIR)/position/*.proto \
		$(PROTO_DIR)/trade/*.proto \
		$(PROTO_DIR)/risk/*.proto \
		$(PROTO_DIR)/signal/*.proto \
		$(PROTO_DIR)/data/*.proto

# =============================================================================
# Development
# =============================================================================

dev: ## Start development environment (infrastructure only)
	@echo "Starting development infrastructure..."
	@docker-compose -f deploy/docker/docker-compose.yml up -d
	@echo "Infrastructure started:"
	@echo "  PostgreSQL: localhost:5432"
	@echo "  Redis:      localhost:6379"
	@echo "  NATS:       localhost:4222"
	@echo "  ClickHouse: localhost:8123"

dev-full: ## Start full development environment (all services)
	@echo "Starting full development environment..."
	@docker-compose -f deploy/docker/docker-compose.yml -f deploy/docker/docker-compose.dev.yml up -d

dev-down: ## Stop development environment
	@echo "Stopping development environment..."
	@docker-compose -f deploy/docker/docker-compose.yml -f deploy/docker/docker-compose.dev.yml down

dev-clean: ## Stop and remove all development data
	@echo "Cleaning development environment..."
	@docker-compose -f deploy/docker/docker-compose.yml -f deploy/docker/docker-compose.dev.yml down -v

# =============================================================================
# Build
# =============================================================================

build: build-go build-python build-rust build-node build-frontend ## Build all services

build-go: ## Build Go services
	@echo "Building Go services..."
	@for svc in $(GO_SERVICES); do \
		echo "Building $$svc..."; \
		cd $$svc && go build -o bin/service ./cmd/... && cd -; \
	done

build-python: ## Build Python services (install dependencies)
	@echo "Building Python services..."
	@for svc in $(PYTHON_SERVICES); do \
		echo "Setting up $$svc..."; \
		cd $$svc && uv sync && cd -; \
	done

build-rust: ## Build Rust services
	@echo "Building Rust services..."
	@cd core && cargo build --release

build-node: ## Build Node.js services
	@echo "Building Node.js services..."
	@for svc in $(NODE_SERVICES); do \
		echo "Building $$svc..."; \
		cd $$svc && npm install && npm run build && cd -; \
	done

build-frontend: ## Build frontend
	@echo "Building frontend..."
	@cd frontend && bun install && bun run build

# =============================================================================
# Docker Build
# =============================================================================

docker-build: ## Build all Docker images
	@echo "Building Docker images..."
	@docker-compose -f deploy/docker/docker-compose.yml -f deploy/docker/docker-compose.dev.yml build

docker-push: ## Push Docker images to registry
	@echo "TODO: Implement docker push"

# =============================================================================
# Test
# =============================================================================

test: test-go test-python test-rust test-node ## Run all tests

test-go: ## Run Go tests
	@echo "Running Go tests..."
	@for svc in $(GO_SERVICES); do \
		echo "Testing $$svc..."; \
		cd $$svc && go test -v ./... && cd -; \
	done

test-python: ## Run Python tests
	@echo "Running Python tests..."
	@for svc in $(PYTHON_SERVICES); do \
		echo "Testing $$svc..."; \
		cd $$svc && uv run pytest && cd -; \
	done

test-rust: ## Run Rust tests
	@echo "Running Rust tests..."
	@cd core && cargo test

test-node: ## Run Node.js tests
	@echo "Running Node.js tests..."
	@for svc in $(NODE_SERVICES); do \
		echo "Testing $$svc..."; \
		cd $$svc && npm test && cd -; \
	done

# =============================================================================
# Lint
# =============================================================================

lint: lint-go lint-python lint-rust ## Run all linters

lint-go: ## Run Go linter
	@echo "Linting Go code..."
	@golangci-lint run ./...

lint-python: ## Run Python linter
	@echo "Linting Python code..."
	@ruff check .
	@mypy .

lint-rust: ## Run Rust linter
	@echo "Linting Rust code..."
	@cd core && cargo clippy -- -D warnings

# =============================================================================
# Database
# =============================================================================

db-migrate: ## Run database migrations
	@echo "Running PostgreSQL migrations..."
	@for f in migrations/postgres/*.sql; do \
		echo "Applying $$f..."; \
		psql "postgresql://mellivora:mellivora_dev@localhost:5432/mellivora" -f "$$f"; \
	done

db-migrate-clickhouse: ## Run ClickHouse migrations
	@echo "Running ClickHouse migrations..."
	@for f in migrations/clickhouse/*.sql; do \
		echo "Applying $$f..."; \
		clickhouse-client --host localhost --user mellivora --password mellivora_dev -d mellivora --multiquery < "$$f"; \
	done

# =============================================================================
# Clean
# =============================================================================

clean: ## Clean build artifacts
	@echo "Cleaning..."
	@rm -rf gen/
	@for svc in $(GO_SERVICES); do \
		rm -rf $$svc/bin; \
	done
	@cd core && cargo clean
	@rm -rf frontend/dist

# =============================================================================
# Help
# =============================================================================

help: ## Show this help
	@echo "Mellivora Mind Studio - Build Commands"
	@echo ""
	@echo "Usage: make [target]"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'
