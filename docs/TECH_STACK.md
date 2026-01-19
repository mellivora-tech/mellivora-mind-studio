# Mellivora Mind Studio - Tech Stack

## Overview

```
+-----------------------------------------------------------------------------------+
|                                                                                   |
|                    High-Performance Polyglot Microservices                        |
|                                                                                   |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|   Frontend        Bun + SolidJS + TailwindCSS                                    |
|                   (Reactive, minimal bundle, instant HMR)                         |
|                                                                                   |
|   API Gateway     Go                                                              |
|                   (High concurrency, low latency routing)                         |
|                                                                                   |
|   Services        Go (Business services)                                          |
|                   Python (Compute services)                                       |
|                   Rust (Core performance)                                         |
|                   Node.js (Agent services)                                        |
|                                                                                   |
+-----------------------------------------------------------------------------------+
```

---

## Language Responsibilities

```
+-----------------------------------------------------------------------------------+
|                                                                                   |
|                           Language Assignment                                     |
|                                                                                   |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|   Go (Gateway + Business Services)                                               |
|   ================================                                                |
|   • API Gateway - Routing, auth, rate limiting                                   |
|   • Account Service - Account management                                         |
|   • Order Service - Order lifecycle management                                   |
|   • Position Service - Position tracking                                         |
|   • Trade Service - Trading channel integration                                  |
|   • Data Service - Data aggregation, caching                                     |
|   • Schedule Service - Task orchestration                                        |
|   • Config Service - Configuration management                                    |
|   • Alert Service - Notification dispatch                                        |
|                                                                                   |
|   Python (Compute Services)                                                      |
|   =========================                                                       |
|   • Risk Compute - Factor model, covariance                                      |
|   • Signal Compute - Alpha signals, timing signals                               |
|   • Optimize Compute - Portfolio optimization                                    |
|   • Backtest Compute - Strategy backtesting                                      |
|   • Attribution Compute - Performance attribution                                |
|   • Data Compute - Factor calculation, data transform                            |
|                                                                                   |
|   Rust (Core Performance)                                                        |
|   =======================                                                         |
|   • Matching Engine - Order matching (if needed)                                 |
|   • Risk Engine Core - Real-time risk calculation                                |
|   • Market Data Engine - Tick data processing                                    |
|   • Covariance Engine - Matrix operations                                        |
|   • Optimizer Core - QP solver                                                   |
|                                                                                   |
|   Node.js (Agent Services)                                                       |
|   ========================                                                        |
|   • Plugin Agent - Plugin lifecycle management                                   |
|   • Data Agent - Data source adapters                                            |
|   • Trade Agent - Trading channel adapters                                       |
|   • Monitor Agent - Health check, metrics                                        |
|   • Sync Agent - Multi-system sync                                               |
|                                                                                   |
|   Bun + SolidJS + TailwindCSS (Frontend)                                        |
|   =======================================                                         |
|   • Dashboard - Real-time portfolio view                                         |
|   • Trading UI - Order management                                                |
|   • Analytics - Charts, reports                                                  |
|   • Admin - System configuration                                                 |
|                                                                                   |
+-----------------------------------------------------------------------------------+
```

---

## Architecture Diagram

```
                                    +------------------+
                                    |    Frontend      |
                                    | Bun + SolidJS    |
                                    +--------+---------+
                                             |
                                             | HTTP/WebSocket
                                             v
+-----------------------------------------------------------------------------------+
|                              API Gateway (Go)                                     |
|   +-------------+  +-------------+  +-------------+  +-------------+             |
|   |   Router    |  |    Auth     |  | Rate Limit  |  |   Circuit   |             |
|   |             |  |   (JWT)     |  |             |  |   Breaker   |             |
|   +-------------+  +-------------+  +-------------+  +-------------+             |
+-----------------------------------------------------------------------------------+
          |                    |                    |                    |
          | gRPC               | gRPC               | gRPC               | gRPC
          v                    v                    v                    v
+----------------+  +----------------+  +----------------+  +----------------+
|  Go Services   |  | Python Compute |  |  Rust Core     |  | Node.js Agent  |
|                |  |                |  |                |  |                |
| • Account      |  | • Risk Compute |  | • Risk Engine  |  | • Plugin Agent |
| • Order        |  | • Signal       |  | • Optimizer    |  | • Data Agent   |
| • Position     |  | • Optimize     |  | • Market Data  |  | • Trade Agent  |
| • Trade        |  | • Backtest     |  | • Covariance   |  | • Monitor      |
| • Data         |  | • Attribution  |  |                |  |                |
| • Schedule     |  |                |  |                |  |                |
+-------+--------+  +-------+--------+  +-------+--------+  +-------+--------+
        |                   |                   |                   |
        +-------------------+-------------------+-------------------+
                                    |
                                    v
+-----------------------------------------------------------------------------------+
|                           Infrastructure                                          |
|   +-------------+  +-------------+  +-------------+  +-------------+             |
|   | PostgreSQL  |  |   Redis     |  |    NATS     |  |  ClickHouse |             |
|   |  (Primary)  |  | (Cache/Pub) |  |  (Messaging)|  | (Analytics) |             |
|   +-------------+  +-------------+  +-------------+  +-------------+             |
+-----------------------------------------------------------------------------------+
```

---

## Service Communication

### Protocol Selection

| Communication | Protocol | Use Case |
|---------------|----------|----------|
| External API | HTTP/REST + WebSocket | Frontend, third-party |
| Service-to-Service | gRPC | High performance, type-safe |
| Event/Async | NATS | Pub/Sub, event streaming |
| Real-time Push | WebSocket | Live updates to frontend |

### Why gRPC for Internal Communication

| Benefit | Description |
|---------|-------------|
| Performance | Binary protocol, 10x faster than JSON |
| Type Safety | Protobuf schemas, cross-language |
| Streaming | Bidirectional streaming support |
| Code Gen | Auto-generate clients for all languages |

### Why NATS for Messaging

| Benefit | Description |
|---------|-------------|
| Performance | 10M+ msg/sec |
| Simplicity | Single binary, zero config |
| Patterns | Pub/Sub, Request/Reply, Queue Groups |
| JetStream | Persistence, exactly-once delivery |

---

## Service Details

### Go Services

```
+-----------------------------------------------------------------------------------+
|                              Go Services                                          |
+-----------------------------------------------------------------------------------+

Gateway Service
===============
Port: 8080
Responsibilities:
  • HTTP/WebSocket routing
  • JWT authentication
  • Rate limiting
  • Circuit breaker
  • Request logging
  • CORS handling

Account Service
===============
Port: 9001
Responsibilities:
  • Account CRUD
  • Cash management
  • Margin calculation
  • Account aggregation
  • Risk monitoring (account level)

Order Service
=============
Port: 9002
Responsibilities:
  • Order creation/validation
  • Order lifecycle management
  • Order splitting logic
  • Order routing decisions
  • Order status tracking

Position Service
================
Port: 9003
Responsibilities:
  • Position tracking
  • Cost calculation (FIFO/Average)
  • P&L calculation
  • Corporate action handling
  • Position snapshot

Trade Service
=============
Port: 9004
Responsibilities:
  • Deal processing
  • Fee calculation
  • Trade reconciliation
  • Channel abstraction
  • Trade reporting

Data Service
============
Port: 9005
Responsibilities:
  • Data aggregation
  • Cache management
  • Data validation
  • Data transformation
  • API for market data

Schedule Service
================
Port: 9006
Responsibilities:
  • Job scheduling
  • DAG execution
  • Retry logic
  • Job monitoring
  • Manual triggers

Config Service
==============
Port: 9007
Responsibilities:
  • Config management
  • Feature flags
  • Multi-tenant config
  • Config versioning
  • Hot reload

Alert Service
=============
Port: 9008
Responsibilities:
  • Alert routing
  • Feishu/DingTalk/Email
  • Alert aggregation
  • Alert history
  • Escalation rules
```

### Python Compute Services

```
+-----------------------------------------------------------------------------------+
|                           Python Compute Services                                 |
+-----------------------------------------------------------------------------------+

Risk Compute Service
====================
Port: 9101
Responsibilities:
  • Factor exposure calculation
  • Covariance estimation
  • Risk decomposition
  • VaR/ES calculation
  • Stress testing
Libraries: numpy, pandas, scipy, statsmodels

Signal Compute Service
======================
Port: 9102
Responsibilities:
  • Alpha signal calculation
  • Timing signal (L0-L3)
  • Signal synthesis
  • IC/IR calculation
  • Signal decay analysis
Libraries: numpy, pandas, talib

Optimize Compute Service
========================
Port: 9103
Responsibilities:
  • Portfolio optimization
  • Constraint handling
  • Rebalancing logic
  • Trade list generation
Libraries: cvxpy, scipy.optimize, numpy

Backtest Compute Service
========================
Port: 9104
Responsibilities:
  • Strategy backtesting
  • Performance metrics
  • Transaction cost modeling
  • Slippage simulation
Libraries: pandas, numpy

Attribution Compute Service
===========================
Port: 9105
Responsibilities:
  • Brinson attribution
  • Factor attribution
  • Trading attribution
  • Performance reporting
Libraries: pandas, numpy
```

### Rust Core Services

```
+-----------------------------------------------------------------------------------+
|                            Rust Core Services                                     |
+-----------------------------------------------------------------------------------+

Risk Engine Core
================
Port: 9201
Responsibilities:
  • Real-time risk calculation
  • Portfolio risk aggregation
  • Limit monitoring
  • Sub-millisecond latency
Features: SIMD, parallel computation

Market Data Engine
==================
Port: 9202
Responsibilities:
  • Tick data processing
  • OHLCV aggregation
  • Real-time feed handling
  • Data normalization
Features: Zero-copy, lock-free queues

Optimizer Core
==============
Port: 9203
Responsibilities:
  • QP solving
  • Large-scale optimization
  • Constraint preprocessing
Features: BLAS/LAPACK bindings

Covariance Engine
=================
Port: 9204
Responsibilities:
  • Matrix operations
  • Eigenvalue decomposition
  • Factor covariance
Features: nalgebra, rayon parallel
```

### Node.js Agent Services

```
+-----------------------------------------------------------------------------------+
|                          Node.js Agent Services                                   |
+-----------------------------------------------------------------------------------+

Plugin Agent
============
Port: 9301
Responsibilities:
  • Plugin discovery
  • Plugin lifecycle
  • Plugin isolation
  • Plugin communication
  • Hot reload

Data Agent
==========
Port: 9302
Responsibilities:
  • Data source adapters
  • Wind/Tushare/JYDB connectors
  • Data normalization
  • Connection pooling
  • Retry logic

Trade Agent
===========
Port: 9303
Responsibilities:
  • Trading channel adapters
  • Xuanye/Renrui/CTP connectors
  • Order translation
  • Status sync
  • Reconnection

Monitor Agent
=============
Port: 9304
Responsibilities:
  • Health checks
  • Metrics collection
  • Log aggregation
  • Alert triggering
  • Dashboard data
```

---

## Frontend Stack

```
+-----------------------------------------------------------------------------------+
|                              Frontend Stack                                       |
+-----------------------------------------------------------------------------------+

Runtime: Bun
============
• Fast JavaScript runtime (3x faster than Node)
• Built-in bundler, test runner, package manager
• Native TypeScript support

Framework: SolidJS
==================
• Fine-grained reactivity (no Virtual DOM)
• Smallest bundle size among major frameworks
• Compiled templates (no runtime overhead)
• React-like syntax, better performance

Styling: TailwindCSS
====================
• Utility-first CSS
• Minimal bundle (purge unused)
• Design system built-in
• JIT compilation

UI Components:
• Kobalte (headless components for Solid)
• Solid-UI (component library)
• Custom components with TailwindCSS

State Management:
• Solid's built-in createSignal/createStore
• No external state library needed

Data Fetching:
• @tanstack/solid-query
• WebSocket for real-time

Charts:
• Lightweight Charts (TradingView)
• Apache ECharts

Build:
• Bun bundler
• Target: ES2022+
```

---

## Database Schema

```
+-----------------------------------------------------------------------------------+
|                              Database Design                                      |
+-----------------------------------------------------------------------------------+

PostgreSQL (Primary)
====================
• accounts          Account information
• positions         Current positions
• orders            Order records
• deals             Deal/trade records
• products          Product configuration
• portfolios        Portfolio definitions
• benchmarks        Benchmark data
• users             User management
• configs           System configuration

Redis (Cache + Pub/Sub)
=======================
• realtime:quotes:{code}     Real-time quotes
• cache:positions:{account}  Position cache
• cache:risk:{portfolio}     Risk metrics cache
• session:{token}            User sessions
• pubsub:orders              Order events
• pubsub:deals               Deal events
• pubsub:alerts              Alert events

ClickHouse (Analytics)
======================
• market_data_daily         Historical daily OHLCV
• market_data_tick          Tick data (optional)
• factor_data               Factor values
• portfolio_history         Historical positions
• performance_history       NAV history
• attribution_history       Attribution results

NATS JetStream (Events)
=======================
• orders.created            Order creation events
• orders.updated            Order status updates
• deals.executed            Deal execution events
• risk.updated              Risk metric updates
• signals.generated         Signal updates
```

---

## Performance Targets

| Metric | Target | How |
|--------|--------|-----|
| API Latency (p99) | < 10ms | Go gateway, gRPC |
| Risk Calculation | < 100ms | Rust core |
| Order Processing | < 5ms | Go + Redis |
| Real-time Update | < 50ms | WebSocket + NATS |
| Frontend FCP | < 500ms | SolidJS + Bun |
| Frontend Bundle | < 100KB | Tree-shaking |

---

## Development Setup

```bash
# Prerequisites
- Go 1.22+
- Python 3.11+
- Rust 1.75+
- Node.js 20+ / Bun 1.0+
- Docker + Docker Compose
- PostgreSQL 16
- Redis 7
- NATS 2.10

# Local Development
docker-compose up -d postgres redis nats clickhouse
make dev-go      # Start Go services
make dev-python  # Start Python services
make dev-rust    # Start Rust services
make dev-node    # Start Node.js agents
cd frontend && bun dev  # Start frontend
```

---

## Deployment

```yaml
# docker-compose.prod.yml structure
services:
  # Gateway
  gateway:
    image: mellivora/gateway:latest
    ports: ["8080:8080"]
    
  # Go Services
  account-service:
    image: mellivora/account-service:latest
  order-service:
    image: mellivora/order-service:latest
  # ... more Go services
  
  # Python Services
  risk-compute:
    image: mellivora/risk-compute:latest
  signal-compute:
    image: mellivora/signal-compute:latest
  # ... more Python services
  
  # Rust Services
  risk-engine:
    image: mellivora/risk-engine:latest
  optimizer-core:
    image: mellivora/optimizer-core:latest
  
  # Node.js Agents
  plugin-agent:
    image: mellivora/plugin-agent:latest
  data-agent:
    image: mellivora/data-agent:latest
  
  # Frontend
  frontend:
    image: mellivora/frontend:latest
    ports: ["80:80"]
  
  # Infrastructure
  postgres:
    image: postgres:16
  redis:
    image: redis:7
  nats:
    image: nats:2.10
  clickhouse:
    image: clickhouse/clickhouse-server:latest
```
