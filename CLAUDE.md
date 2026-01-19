# CLAUDE.md - Mellivora Mind Studio

## Project Overview

**Mellivora Mind Studio** is a professional quantitative investment management platform with pluggable architecture, designed as a commercial product.

## Tech Stack (Polyglot Microservices)

| Layer | Technology | Purpose |
|-------|------------|---------|
| Gateway | Go | API routing, auth, rate limiting |
| Business Services | Go | Account, Order, Position, Trade, etc. |
| Compute Services | Python | Risk, Signal, Optimize, Backtest |
| Core Performance | Rust | Real-time risk, optimizer, market data |
| Agent Services | Node.js | Plugins, data adapters, trade adapters |
| Frontend | Bun + SolidJS + TailwindCSS | High-performance reactive UI |
| Communication | gRPC + NATS | Service-to-service + events |
| Database | PostgreSQL + Redis + ClickHouse | Primary + Cache + Analytics |

## Documentation

All design documents are in `docs/` directory:

| Document | Purpose |
|----------|---------|
| docs/README.md | Navigation and multi-window guide |
| docs/ARCHITECTURE.md | System architecture and daily workflow |
| docs/MODULES.md | Complete module and function list |
| docs/TECH_STACK.md | Technology stack and service details |
| docs/PROJECT_STRUCTURE.md | Directory structure and ports |
| docs/TRADE_ANALYSIS.md | Account/Position/Order/Deal specification |
| docs/PLUGINS.md | Plugin interface specification |

## Architecture Principles

1. **Polyglot Microservices**: Right language for right job
2. **Pluggable Data Sources**: Wind, JYDB, Tushare, CSV, etc.
3. **Pluggable Trading Channels**: Xuanye, Renrui, Jinxin, CTP, etc.
4. **Extreme Performance**: Rust core, gRPC, NATS, SolidJS
5. **Multi-product Support**: Manage 8+ fund products in parallel

## Key Design Decisions

- NO code in architecture docs - design only
- Data and Trading are pluggable interfaces (Node.js agents)
- Support both SaaS and private deployment
- Trade Analysis Engine: Account, Position, Order, Deal

## Project Structure (Summary)

```
mellivora-mind-studio/
├── docs/                    # Design documents (READ FIRST)
├── proto/                   # Protobuf definitions (shared)
├── gateway/                 # Go - API Gateway
├── services/                # Go - Business Services
│   ├── account/
│   ├── order/
│   ├── position/
│   └── ...
├── compute/                 # Python - Compute Services
│   ├── risk/
│   ├── signal/
│   ├── optimize/
│   └── ...
├── core/                    # Rust - Core Performance
│   ├── risk-engine/
│   ├── optimizer-core/
│   └── ...
├── agents/                  # Node.js - Agent Services
│   ├── data-agent/
│   ├── trade-agent/
│   └── ...
├── frontend/                # Bun + SolidJS + TailwindCSS
├── plugins/                 # Plugin Implementations
├── migrations/              # Database Migrations
└── deploy/                  # Docker/K8s configs
```

## Service Ports (Quick Reference)

| Range | Language | Services |
|-------|----------|----------|
| 8080 | Go | Gateway |
| 9001-9008 | Go | Business services |
| 9101-9105 | Python | Compute services |
| 9201-9204 | Rust | Core services |
| 9301-9304 | Node.js | Agent services |
| 3000 | Bun | Frontend |

## Working with Multiple Windows

Each window should:
1. Read `docs/README.md` first
2. Focus on specific language/module
3. Follow interface contracts in `docs/PLUGINS.md`
4. Use `proto/` for cross-language types

## Commands

```bash
# View all docs
ls docs/

# Read tech stack
cat docs/TECH_STACK.md

# Read project structure
cat docs/PROJECT_STRUCTURE.md

# Check service ports
grep -A 30 "Service Ports" docs/PROJECT_STRUCTURE.md
```
