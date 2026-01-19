# Mellivora Mind Studio

A high-performance quantitative investment asset management platform built with a polyglot microservices architecture.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend                                 │
│                    (Bun + SolidJS + TailwindCSS)                │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTP/WebSocket
┌───────────────────────────▼─────────────────────────────────────┐
│                       API Gateway (Go)                           │
│              Auth, Rate Limiting, Routing, gRPC→REST             │
└───────────────────────────┬─────────────────────────────────────┘
                            │ gRPC
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼───────┐   ┌───────▼───────┐   ┌───────▼───────┐
│  Go Services  │   │Python Compute │   │  Rust Core    │
│   (Business)  │   │   (Analysis)  │   │ (Performance) │
├───────────────┤   ├───────────────┤   ├───────────────┤
│ • Account     │   │ • Risk        │   │ • Risk Engine │
│ • Order       │   │ • Signal      │   │ • Market Data │
│ • Position    │   │ • Optimize    │   │ • Optimizer   │
│ • Trade       │   │ • Backtest    │   │ • Covariance  │
│ • Data        │   │ • Attribution │   └───────────────┘
│ • Schedule    │   └───────────────┘
│ • Config      │
│ • Alert       │
└───────┬───────┘
        │
┌───────▼───────┐   ┌───────────────┐   ┌───────────────┐
│  Node.js      │   │    NATS       │   │   PostgreSQL  │
│   Agents      │   │  (Messaging)  │   │    Redis      │
├───────────────┤   └───────────────┘   │   ClickHouse  │
│ • Plugin      │                       └───────────────┘
│ • Data        │
│ • Trade       │
│ • Monitor     │
└───────────────┘
```

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Go 1.22+
- Python 3.11+ with uv
- Rust 1.75+
- Node.js 20+ or Bun 1.0+
- protoc (Protocol Buffers compiler)

### Development Setup

```bash
# 1. Start infrastructure (PostgreSQL, Redis, NATS, ClickHouse)
make dev

# 2. Generate protobuf code
make proto

# 3. Run database migrations
make db-migrate

# 4. Start services (in separate terminals or use tmux)
cd gateway && go run ./cmd/gateway
cd services/account && go run ./cmd/account
# ... start other services as needed

# 5. Start frontend
cd frontend && bun dev
```

### Using Docker Compose

```bash
# Start full environment
make dev-full

# Stop environment
make dev-down

# Clean (remove volumes)
make dev-clean
```

## Project Structure

```
mellivora-mind-studio/
├── docs/                    # Design documents
├── proto/                   # Protobuf definitions
├── gen/                     # Generated code (gitignored)
├── gateway/                 # Go - API Gateway
├── services/                # Go - Business services
│   ├── account/
│   ├── order/
│   ├── position/
│   ├── trade/
│   ├── data/
│   ├── schedule/
│   ├── config/
│   └── alert/
├── compute/                 # Python - Compute services
│   ├── risk/
│   ├── signal/
│   ├── optimize/
│   ├── backtest/
│   └── attribution/
├── core/                    # Rust - High-performance core
│   ├── risk-engine/
│   ├── market-data/
│   ├── optimizer-core/
│   └── covariance/
├── agents/                  # Node.js - Plugin agents
│   ├── plugin-agent/
│   ├── data-agent/
│   ├── trade-agent/
│   └── monitor-agent/
├── frontend/                # Bun + SolidJS
├── plugins/                 # Plugin implementations
│   ├── data-plugins/        # Wind, Tushare, CSV, etc.
│   └── trade-plugins/       # Xuanye, Renrui, CTP, etc.
├── migrations/              # Database migrations
├── deploy/                  # Deployment configs
├── scripts/                 # Development scripts
└── Makefile                 # Build commands
```

## Service Ports

| Service | Port | Language |
|---------|------|----------|
| Gateway | 8080 | Go |
| Account | 9001 | Go |
| Order | 9002 | Go |
| Position | 9003 | Go |
| Trade | 9004 | Go |
| Data | 9005 | Go |
| Schedule | 9006 | Go |
| Config | 9007 | Go |
| Alert | 9008 | Go |
| Risk Compute | 9101 | Python |
| Signal Compute | 9102 | Python |
| Optimize Compute | 9103 | Python |
| Backtest Compute | 9104 | Python |
| Attribution | 9105 | Python |
| Risk Engine Core | 9201 | Rust |
| Market Data Engine | 9202 | Rust |
| Optimizer Core | 9203 | Rust |
| Covariance Engine | 9204 | Rust |
| Plugin Agent | 9301 | Node.js |
| Data Agent | 9302 | Node.js |
| Trade Agent | 9303 | Node.js |
| Monitor Agent | 9304 | Node.js |
| Frontend | 3000 | Bun |

## Make Commands

```bash
make help           # Show all available commands
make proto          # Generate protobuf code for all languages
make dev            # Start development infrastructure
make dev-full       # Start all services
make build          # Build all services
make test           # Run all tests
make lint           # Run all linters
make clean          # Clean build artifacts
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md) - System architecture and design
- [Modules](docs/MODULES.md) - Module specifications
- [Trade Analysis](docs/TRADE_ANALYSIS.md) - Trading engine design
- [Plugins](docs/PLUGINS.md) - Plugin interfaces
- [Tech Stack](docs/TECH_STACK.md) - Technology choices
- [Project Structure](docs/PROJECT_STRUCTURE.md) - Directory layout

## License

Proprietary - All rights reserved.
