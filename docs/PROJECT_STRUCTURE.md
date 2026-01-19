# Mellivora Mind Studio - Project Structure

## Monorepo Structure

```
mellivora-mind-studio/
│
├── docs/                           # Design documents
│   ├── README.md                   # Navigation
│   ├── ARCHITECTURE.md             # System architecture
│   ├── MODULES.md                  # Module specification
│   ├── TECH_STACK.md               # Technology stack
│   ├── TRADE_ANALYSIS.md           # Trade analysis design
│   ├── PLUGINS.md                  # Plugin specification
│   └── PROJECT_STRUCTURE.md        # This file
│
├── proto/                          # Protobuf definitions (shared)
│   ├── common/                     # Common types
│   │   ├── types.proto
│   │   └── errors.proto
│   ├── account/
│   │   └── account.proto
│   ├── order/
│   │   └── order.proto
│   ├── position/
│   │   └── position.proto
│   ├── trade/
│   │   └── trade.proto
│   ├── risk/
│   │   └── risk.proto
│   ├── signal/
│   │   └── signal.proto
│   └── data/
│       └── data.proto
│
├── gateway/                        # Go - API Gateway
│   ├── cmd/
│   │   └── gateway/
│   │       └── main.go
│   ├── internal/
│   │   ├── router/
│   │   ├── middleware/
│   │   ├── handler/
│   │   └── config/
│   ├── go.mod
│   └── Dockerfile
│
├── services/                       # Go - Business Services
│   ├── account/
│   │   ├── cmd/
│   │   ├── internal/
│   │   ├── go.mod
│   │   └── Dockerfile
│   ├── order/
│   │   ├── cmd/
│   │   ├── internal/
│   │   ├── go.mod
│   │   └── Dockerfile
│   ├── position/
│   │   ├── cmd/
│   │   ├── internal/
│   │   ├── go.mod
│   │   └── Dockerfile
│   ├── trade/
│   │   ├── cmd/
│   │   ├── internal/
│   │   ├── go.mod
│   │   └── Dockerfile
│   ├── data/
│   │   ├── cmd/
│   │   ├── internal/
│   │   ├── go.mod
│   │   └── Dockerfile
│   ├── schedule/
│   │   ├── cmd/
│   │   ├── internal/
│   │   ├── go.mod
│   │   └── Dockerfile
│   ├── config/
│   │   ├── cmd/
│   │   ├── internal/
│   │   ├── go.mod
│   │   └── Dockerfile
│   └── alert/
│       ├── cmd/
│       ├── internal/
│       ├── go.mod
│       └── Dockerfile
│
├── compute/                        # Python - Compute Services
│   ├── risk/
│   │   ├── src/
│   │   │   ├── __init__.py
│   │   │   ├── factor_model.py
│   │   │   ├── covariance.py
│   │   │   ├── decomposition.py
│   │   │   ├── var.py
│   │   │   └── grpc_server.py
│   │   ├── pyproject.toml
│   │   └── Dockerfile
│   ├── signal/
│   │   ├── src/
│   │   │   ├── __init__.py
│   │   │   ├── alpha.py
│   │   │   ├── timing.py
│   │   │   ├── synthesis.py
│   │   │   └── grpc_server.py
│   │   ├── pyproject.toml
│   │   └── Dockerfile
│   ├── optimize/
│   │   ├── src/
│   │   │   ├── __init__.py
│   │   │   ├── optimizer.py
│   │   │   ├── constraints.py
│   │   │   ├── rebalance.py
│   │   │   └── grpc_server.py
│   │   ├── pyproject.toml
│   │   └── Dockerfile
│   ├── backtest/
│   │   ├── src/
│   │   ├── pyproject.toml
│   │   └── Dockerfile
│   └── attribution/
│       ├── src/
│       ├── pyproject.toml
│       └── Dockerfile
│
├── core/                           # Rust - Core Performance
│   ├── Cargo.toml                  # Workspace
│   ├── risk-engine/
│   │   ├── src/
│   │   │   ├── lib.rs
│   │   │   ├── portfolio.rs
│   │   │   ├── factor.rs
│   │   │   └── grpc.rs
│   │   └── Cargo.toml
│   ├── market-data/
│   │   ├── src/
│   │   │   ├── lib.rs
│   │   │   ├── tick.rs
│   │   │   ├── ohlcv.rs
│   │   │   └── grpc.rs
│   │   └── Cargo.toml
│   ├── optimizer-core/
│   │   ├── src/
│   │   │   ├── lib.rs
│   │   │   ├── qp.rs
│   │   │   ├── constraints.rs
│   │   │   └── grpc.rs
│   │   └── Cargo.toml
│   └── covariance/
│       ├── src/
│       │   ├── lib.rs
│       │   ├── matrix.rs
│       │   └── grpc.rs
│       └── Cargo.toml
│
├── agents/                         # Node.js - Agent Services
│   ├── plugin-agent/
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── registry.ts
│   │   │   ├── loader.ts
│   │   │   └── grpc.ts
│   │   ├── package.json
│   │   └── Dockerfile
│   ├── data-agent/
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── adapters/
│   │   │   │   ├── wind.ts
│   │   │   │   ├── tushare.ts
│   │   │   │   └── csv.ts
│   │   │   └── grpc.ts
│   │   ├── package.json
│   │   └── Dockerfile
│   ├── trade-agent/
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── adapters/
│   │   │   │   ├── xuanye.ts
│   │   │   │   ├── renrui.ts
│   │   │   │   └── ctp.ts
│   │   │   └── grpc.ts
│   │   ├── package.json
│   │   └── Dockerfile
│   └── monitor-agent/
│       ├── src/
│       ├── package.json
│       └── Dockerfile
│
├── frontend/                       # Bun + SolidJS + TailwindCSS
│   ├── src/
│   │   ├── index.tsx
│   │   ├── App.tsx
│   │   ├── routes/
│   │   │   ├── dashboard/
│   │   │   ├── trading/
│   │   │   ├── analytics/
│   │   │   └── admin/
│   │   ├── components/
│   │   │   ├── ui/
│   │   │   ├── charts/
│   │   │   └── layout/
│   │   ├── stores/
│   │   ├── services/
│   │   │   ├── api.ts
│   │   │   └── websocket.ts
│   │   └── styles/
│   │       └── global.css
│   ├── public/
│   ├── index.html
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── package.json
│   └── Dockerfile
│
├── plugins/                        # Plugin Implementations
│   ├── data-plugins/
│   │   ├── wind/
│   │   ├── tushare/
│   │   ├── jydb/
│   │   └── csv/
│   └── trade-plugins/
│       ├── xuanye/
│       ├── renrui/
│       ├── jinxin/
│       └── ctp/
│
├── migrations/                     # Database Migrations
│   ├── postgres/
│   │   ├── 001_init.sql
│   │   ├── 002_accounts.sql
│   │   └── ...
│   └── clickhouse/
│       ├── 001_market_data.sql
│       └── ...
│
├── deploy/                         # Deployment Configs
│   ├── docker/
│   │   ├── docker-compose.yml
│   │   ├── docker-compose.dev.yml
│   │   └── docker-compose.prod.yml
│   ├── k8s/
│   │   ├── base/
│   │   └── overlays/
│   └── scripts/
│       ├── build.sh
│       └── deploy.sh
│
├── scripts/                        # Development Scripts
│   ├── proto-gen.sh               # Generate protobuf code
│   ├── dev.sh                     # Start dev environment
│   └── test.sh                    # Run all tests
│
├── Makefile                        # Build commands
├── .gitignore
├── CLAUDE.md                       # AI assistant context
└── README.md                       # Project overview
```

---

## Module Mapping

| Module (docs/MODULES.md) | Implementation |
|--------------------------|----------------|
| Data Engine | `services/data/` + `agents/data-agent/` |
| Risk Engine | `compute/risk/` + `core/risk-engine/` |
| Signal Engine | `compute/signal/` |
| Optimize Engine | `compute/optimize/` + `core/optimizer-core/` |
| Trade Analysis Engine | `services/account/` + `services/order/` + `services/position/` + `services/trade/` |
| Tracking Engine | `services/data/` + `compute/attribution/` |
| Infrastructure | `gateway/` + `services/schedule/` + `services/config/` + `services/alert/` |

---

## Service Ports

| Service | Port | Language |
|---------|------|----------|
| Gateway | 8080 | Go |
| Account Service | 9001 | Go |
| Order Service | 9002 | Go |
| Position Service | 9003 | Go |
| Trade Service | 9004 | Go |
| Data Service | 9005 | Go |
| Schedule Service | 9006 | Go |
| Config Service | 9007 | Go |
| Alert Service | 9008 | Go |
| Risk Compute | 9101 | Python |
| Signal Compute | 9102 | Python |
| Optimize Compute | 9103 | Python |
| Backtest Compute | 9104 | Python |
| Attribution Compute | 9105 | Python |
| Risk Engine Core | 9201 | Rust |
| Market Data Engine | 9202 | Rust |
| Optimizer Core | 9203 | Rust |
| Covariance Engine | 9204 | Rust |
| Plugin Agent | 9301 | Node.js |
| Data Agent | 9302 | Node.js |
| Trade Agent | 9303 | Node.js |
| Monitor Agent | 9304 | Node.js |
| Frontend | 3000 | Bun |

---

## Development Workflow

```
1. Edit proto/*.proto
2. Run: make proto         # Generate code for all languages
3. Develop in respective directories
4. Run: make dev           # Start all services
5. Test: make test         # Run all tests
6. Build: make build       # Build all services
7. Deploy: make deploy     # Deploy to target
```
