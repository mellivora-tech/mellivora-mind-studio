# Mellivora Mind Studio - Module List

## Module Overview

| Module | Sub-modules | Priority |
|--------|-------------|----------|
| Data Engine | Market Data, Base Data, Factor Data, Financial Data, Product Data | P0 |
| Risk Engine | Factor Model, Covariance, Risk Decomposition, VaR | P0 |
| Signal Engine | Timing Signals, Alpha Signals, ML Signals, Backtesting | P0 |
| Optimize Engine | Optimization, Constraints, Rebalancing, Trade List | P0 |
| Trade Analysis Engine | Account, Position, Order, Deal, Analysis | P0 |
| Tracking Engine | Real-time Tracking, Attribution, Performance, Reports | P0 |
| Infrastructure | Scheduler, Config, Event, Storage, Log, Alert, API | P0 |

---

## 1. Data Engine

### 1.1 Market Data
| Function | Description |
|----------|-------------|
| Stock Daily | A-shares/HK Connect OHLCV, adjustment factors, limits |
| Index Daily | Broad-based indices, sector indices |
| ETF Daily | On-exchange ETFs, LOFs |
| Futures Daily | Equity index futures, commodity futures, settlement |
| Options Daily | ETF options, index options, Greeks |
| Convertible Bonds | CB prices, conversion value, premium |
| Real-time Quotes | Intraday push/polling |

### 1.2 Base Data
| Function | Description |
|----------|-------------|
| Index Weights | CSI 300/500/1000 components and weights |
| Industry Classification | CITIC/SW/Wind industries |
| Stock Universe | All A, tradable, ST flag, suspension |
| Trading Calendar | A-share/HK/Futures calendar |
| Security Info | Listing date, delisting, share structure |

### 1.3 Factor Data
| Function | Description |
|----------|-------------|
| Barra Style Factors | Size/Beta/Momentum/Vol/Value/Growth/Liquidity etc. |
| Industry Factors | 30 CITIC Level-1 industry dummies |
| Custom Factors | User-defined factor extension |

### 1.4 Financial Data
| Function | Description |
|----------|-------------|
| Financial Statements | Balance sheet, income, cash flow |
| Financial Metrics | ROE/ROA/PE/PB/PS etc. |
| Consensus Estimates | Analyst consensus EPS/Revenue |

### 1.5 Alternative Data
| Function | Description |
|----------|-------------|
| Macro Economic | GDP/CPI/PMI/Social Financing |
| Fund Flow | Northbound, margin trading |
| Volatility Index | VIX calculation, implied vol |

### 1.6 Product Data
| Function | Description |
|----------|-------------|
| Valuation Report Parsing | Level-4 account parsing, multi-format |
| NAV Data | Product NAV, shares |
| Position Data | Channel position sync |

---

## 2. Risk Engine

### 2.1 Factor Model
| Function | Description |
|----------|-------------|
| Style Factor Calculation | 10 Barra style factors |
| Industry Factor Calculation | 30 CITIC Level-1 |
| Factor Standardization | Winsorization, normalization, missing value |
| Factor Exposure | Stock/Portfolio factor exposures |

### 2.2 Covariance Estimation
| Function | Description |
|----------|-------------|
| Factor Returns | Cross-sectional regression |
| Factor Covariance Matrix | Exponential weighted/Newey-West |
| Specific Risk | Stock residual volatility |
| Covariance Synthesis | Factor cov + specific risk -> full cov |

### 2.3 Risk Decomposition
| Function | Description |
|----------|-------------|
| Total Portfolio Risk | Tracking error, active risk |
| Factor Risk Contribution | Each factor's contribution |
| Stock Risk Contribution | Marginal contribution by holding |
| Risk Attribution | Systematic vs specific |

### 2.4 Risk Metrics
| Function | Description |
|----------|-------------|
| VaR | Historical/Parametric/Monte Carlo |
| ES/CVaR | Tail risk measure |
| Stress Testing | Scenario analysis, historical replay |
| Sensitivity | Delta/Gamma/Vega (derivatives) |

### 2.5 Risk Monitoring
| Function | Description |
|----------|-------------|
| Limit Monitoring | Factor/industry/stock limits |
| Alert Mechanism | Breach alerts, threshold warnings |
| Risk Report | Daily risk report generation |

---

## 3. Signal Engine

### 3.1 Timing Signals
| Function | Description |
|----------|-------------|
| L0 Signal | Base market state signal |
| L1 Signal | Level-1 timing signal |
| L2 Signal | Level-2 timing signal |
| L3 Signal | Level-3 timing signal |
| Signal Synthesis | Multi-level signal combination |

### 3.2 Alpha Signals
| Function | Description |
|----------|-------------|
| Multi-factor Score | Factor-based stock scoring |
| Score Normalization | Rank transform, normalization |
| Score Combination | Weighted score synthesis |

### 3.3 ML Signals (Optional)
| Function | Description |
|----------|-------------|
| LightGBM Prediction | Qlib-based ML signals |
| Model Training | Hyperparameter tuning, CV |
| Model Evaluation | IC/IR/Group returns |

### 3.4 Signal Backtesting
| Function | Description |
|----------|-------------|
| Signal Validity Test | IC/RankIC/ICIR |
| Group Backtest | Quantile portfolio returns |
| Turnover Analysis | Signal stability |
| Decay Analysis | Signal prediction horizon |

---

## 4. Optimize Engine

### 4.1 Optimization Objective
| Function | Description |
|----------|-------------|
| Maximize Alpha | Maximize expected excess return |
| Minimize Risk | Minimize variance/TE |
| Risk-adjusted Return | Maximize IR/Sharpe |
| Utility Function | Mean-variance utility |

### 4.2 Constraints
| Function | Description |
|----------|-------------|
| Weight Constraints | Stock upper/lower bounds, sum=1 |
| Industry Constraints | Industry deviation from benchmark |
| Style Constraints | Factor exposure limits |
| Turnover Constraints | Daily turnover cap |
| TE Constraints | Tracking error cap |
| Liquidity Constraints | Volume/market cap constraints |
| Count Constraints | Number of holdings limit |

### 4.3 Optimization Solving
| Function | Description |
|----------|-------------|
| Quadratic Programming | Convex optimization solver |
| Sequential QP | Nonlinear constraint handling |
| Heuristic Algorithms | Large-scale problem solving |

### 4.4 Rebalancing Strategy
| Function | Description |
|----------|-------------|
| Periodic Rebalancing | Daily/Weekly/Monthly |
| Threshold Trigger | Deviation-triggered rebalancing |
| Cost-aware Optimization | Cost-considered rebalancing |

### 4.5 Portfolio Construction
| Function | Description |
|----------|-------------|
| Target Portfolio | Optimized target weights |
| Trade List Generation | Target weights -> buy/sell list |
| Cash Constraint | Buy-sell balance (e.g., <= 500k) |

---

## 5. Trade Analysis Engine

### 5.1 Account Management
| Function | Description |
|----------|-------------|
| Multi-account Management | Account classification, status |
| Cash Management | Balance, available, frozen, in/out |
| Risk Management | Leverage, margin, warning/close line |
| Statistics | Return, utilization, NAV curve, drawdown |

### 5.2 Position Management
| Function | Description |
|----------|-------------|
| Position Maintenance | Real-time sync, aggregation, available qty |
| Cost Management | Cost calculation, P&L, corporate actions |
| Position Analysis | Concentration, industry, factor exposure |
| Change Tracking | History, buy/sell detail, holding period |

### 5.3 Order Management
| Function | Description |
|----------|-------------|
| Order Types | LIMIT/MARKET/TWAP/VWAP/STOP/ALGO |
| Order Lifecycle | Create->Validate->Submit->Track->Complete |
| Order Processing | Validation, smart splitting, routing |
| Order Analysis | Execution efficiency, slippage, fill rate |

### 5.4 Deal Management
| Function | Description |
|----------|-------------|
| Deal Processing | Receive, link to order, aggregation |
| Fee Calculation | Commission, stamp duty, transfer fee |
| Deal Analysis | Price, VWAP deviation, market impact |
| Reconciliation | Channel reconciliation, clearing reconciliation |

### 5.5 Trade Analysis
| Function | Description |
|----------|-------------|
| Execution Analysis | Efficiency, implementation shortfall |
| Cost Analysis | Explicit/implicit/opportunity cost |
| Attribution Analysis | Trade contribution, timing |
| Compliance Analysis | Restriction check, violation detection |

---

## 6. Tracking Engine

### 6.1 Real-time Tracking
| Function | Description |
|----------|-------------|
| Real-time P&L | Intraday P&L calculation |
| Real-time Valuation | Real-time market value |
| Benchmark Comparison | Real-time excess return |
| Position Monitoring | Real-time position level |

### 6.2 Attribution Analysis
| Function | Description |
|----------|-------------|
| Brinson Attribution | Allocation/Selection/Interaction |
| Factor Attribution | Factor return contribution |
| Industry Attribution | Industry allocation/selection |
| Trade Attribution | Trading impact on returns |

### 6.3 Performance Evaluation
| Function | Description |
|----------|-------------|
| Return Metrics | Cumulative/Annualized/Monthly |
| Risk Metrics | Volatility/Max Drawdown/VaR |
| Risk-adjusted Metrics | Sharpe/IR/Calmar |
| Relative Metrics | Excess return/TE/Win rate |

### 6.4 Report Generation
| Function | Description |
|----------|-------------|
| Daily Report | Daily performance, position, trade summary |
| Weekly/Monthly Report | Periodic performance analysis |
| Attribution Report | Detailed attribution analysis |
| Risk Report | Risk metrics summary |

---

## 7. Infrastructure

### 7.1 Scheduler
| Function | Description |
|----------|-------------|
| Scheduled Tasks | Cron-based scheduling |
| Dependency Management | Task DAG |
| Retry Mechanism | Failure retry |
| Task Monitoring | Status tracking |
| Manual Trigger | On-demand execution |

### 7.2 Config Center
| Function | Description |
|----------|-------------|
| Multi-environment | dev/test/prod configs |
| Multi-tenant | Tenant isolation |
| Version Control | Config versioning |
| Hot Reload | Runtime config update |
| Secret Management | Encrypted sensitive data |

### 7.3 Event Bus
| Function | Description |
|----------|-------------|
| Pub/Sub | Event publish/subscribe |
| Message Queue | Async message processing |
| Event Persistence | Event storage |
| Event Replay | Historical event replay |

### 7.4 Storage
| Function | Description |
|----------|-------------|
| RDBMS | MySQL/PostgreSQL |
| Time Series DB | Optional |
| Cache | Redis |
| File Storage | Local/S3 |

### 7.5 Logger
| Function | Description |
|----------|-------------|
| Structured Logging | JSON format |
| Log Levels | DEBUG/INFO/WARN/ERROR |
| Log Archival | Rotation and retention |
| Log Query | Search and filter |

### 7.6 Alerter
| Function | Description |
|----------|-------------|
| Feishu Bot | Feishu webhook |
| DingTalk Bot | DingTalk webhook |
| Email Alert | SMTP email |
| SMS Alert | Optional |

### 7.7 API Gateway
| Function | Description |
|----------|-------------|
| REST API | HTTP endpoints |
| Authentication | Token-based auth |
| Rate Limiting | Request throttling |
| API Docs | OpenAPI/Swagger |
