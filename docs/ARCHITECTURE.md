# Mellivora Mind Studio - Architecture

## Product Positioning

```
Mellivora Mind Studio
Professional Quantitative Investment Management Platform
Pluggable Architecture | Commercial Product

"Fearless like a honey badger, professional like a studio"
```

## Target Users

- Quantitative Hedge Funds
- Asset Management Companies
- Family Offices
- Securities Proprietary Trading / Asset Management

## Core Value

- Full lifecycle management (Data -> Signal -> Trade -> Tracking)
- Pluggable architecture (Data sources / Trading channels freely switchable)
- Multi-product parallel management
- Professional-grade trading analysis

---

## System Architecture

```
+-----------------------------------------------------------------------------------+
|                                                                                   |
|                          Mellivora Mind Studio Architecture                       |
|                                                                                   |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|   +-----------------------------------------------------------------------+       |
|   |                         Plugin Layer                                  |       |
|   |  +---------------------------+   +-----------------------------+      |       |
|   |  |    Data Source Plugins    |   |   Trading Channel Plugins   |      |       |
|   |  | Wind|JYDB|Tushare|EM|CSV  |   | Securities|Futures|Options  |      |       |
|   |  +---------------------------+   +-----------------------------+      |       |
|   +-----------------------------------------------------------------------+       |
|                                    |                                              |
|   +--------------------------------|------------------------------------------+   |
|   |                         Core Engine Layer                                 |   |
|   |  +--------+ +--------+ +--------+ +--------+ +--------+ +-------------+  |   |
|   |  |  Data  | |  Risk  | |Optimize| | Signal | | Track  | |Trade Analysis| |   |
|   |  | Engine | | Engine | | Engine | | Engine | | Engine | |   Engine    | |   |
|   |  +--------+ +--------+ +--------+ +--------+ +--------+ +-------------+  |   |
|   +--------------------------------------------------------------------------+   |
|                                    |                                              |
|   +--------------------------------|------------------------------------------+   |
|   |                      Infrastructure Layer                                 |   |
|   |  +--------+ +--------+ +--------+ +--------+ +--------+ +--------+       |   |
|   |  |Schedule| | Config | | Event  | |Storage | |  Log   | | Alert  |       |   |
|   |  +--------+ +--------+ +--------+ +--------+ +--------+ +--------+       |   |
|   +--------------------------------------------------------------------------+   |
|                                                                                   |
+-----------------------------------------------------------------------------------+
```

---

## Layer Description

### Plugin Layer

Pluggable external integration layer, supports hot-swapping

| Category | Supported |
|----------|-----------|
| Data Sources | Wind API, Wind DB, JYDB, Tushare, East Money, CSV |
| Trading Channels | Xuanye, Renrui, Jinxin, Huatai, CITIC, CTP |

### Core Engine Layer

Business logic layer, data source and channel agnostic

| Engine | Responsibility |
|--------|---------------|
| Data Engine | Market data aggregation, factor calculation, index weights |
| Risk Engine | Factor model, covariance, risk decomposition, VaR |
| Signal Engine | Timing signals (L0-L3), Alpha signals, backtesting |
| Optimize Engine | Portfolio optimization, constraints, rebalancing |
| Trade Analysis Engine | Order/Deal/Position/Account management & analysis |
| Tracking Engine | Real-time P&L, attribution, performance evaluation |

### Infrastructure Layer

Common foundational services

| Service | Function |
|---------|----------|
| Scheduler | Task scheduling, dependency management |
| Config Center | Multi-env config, multi-tenant, hot reload |
| Event Bus | Pub/Sub, message queue |
| Storage | MySQL/TimeSeries DB/Redis/File |
| Logger | Structured logging |
| Alerter | Feishu/DingTalk/Email/SMS |

---

## Daily Workflow

```
Pre-market (09:00-09:30)
  09:00  Data integrity check
  09:15  Position sync
  09:25  Trading list confirmation

Intraday (09:30-15:00)
  09:30  Trading execution starts
  09:30+ Real-time tracking (30s polling)
         - Real-time P&L
         - Position changes
         - Order status
         - Risk monitoring
  14:55  End-of-day trading
  15:00  Stop real-time tracking

Post-market (15:00-17:00)
  15:30  Data quality check
  16:00  Archive real-time data
  16:30  Trading reconciliation
  17:00  Daily report generation

Night Batch (21:00-23:00)
  21:00  Market data update
  21:30  Risk model update
  21:45  Signal calculation
  22:00  Portfolio optimization
  22:15  Weight snapshot
  22:30  Trading list generation
  23:00  Batch complete
```

---

## Product Deployment Modes

| Mode | Description |
|------|-------------|
| Open Source Core + Commercial Plugins | Core engine MIT, plugins commercial |
| SaaS Cloud Service | Multi-tenant, pay per product |
| Private Deployment | On-premise, custom plugins |
