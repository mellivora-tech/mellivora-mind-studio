# Mellivora Mind Studio - Plugin Specification

## Overview

Mellivora Mind Studio uses a plugin architecture for:
1. **Data Source Plugins** - Market data, factor data, financial data
2. **Trading Channel Plugins** - Order execution, position sync

All business logic in Core Engines is plugin-agnostic.

---

## 1. Data Source Plugin (DataProvider)

### Interface Definition

| Category | Method/Property | Description |
|----------|-----------------|-------------|
| **Properties** | name | Plugin name |
| | supported_assets | List of supported asset types |
| **Market Data** | get_daily_quotes(codes, start, end, fields) | Get daily OHLCV |
| | get_realtime_quotes(codes) | Get real-time quotes |
| **Index Data** | get_index_weights(index_code, date) | Get index component weights |
| **Factor Data** | get_factor_data(factors, codes, start, end) | Get factor values |
| **Financial Data** | get_financial_data(codes, fields, date) | Get financial metrics |
| **Subscription** | subscribe(codes, callback) | Subscribe to real-time (optional) |
| | unsubscribe(codes) | Unsubscribe (optional) |

### Supported Asset Types

| Asset Type | Code | Description |
|------------|------|-------------|
| stock | STOCK | A-shares, HK Connect |
| index | INDEX | Broad-based, sector indices |
| etf | ETF | On-exchange ETFs |
| future | FUTURE | Equity index, commodity futures |
| option | OPTION | ETF options, index options |
| bond | BOND | Convertible bonds |

### Available Implementations

| Plugin | Data Source | Assets | Real-time |
|--------|-------------|--------|-----------|
| wind_api | Wind API | All | Yes |
| wind_db | Wind Database | All | No |
| jydb | JYDB | Stock, Index, ETF | No |
| tushare | Tushare Pro | Stock, Index, ETF, Future | No |
| eastmoney | East Money Choice | Stock, Index, ETF | Yes |
| csv_file | Local CSV | Any | No |

---

## 2. Trading Channel Plugin (TradeExecutor)

### Interface Definition

| Category | Method/Property | Description |
|----------|-----------------|-------------|
| **Properties** | name | Channel name |
| | supported_assets | Supported asset types |
| | supported_order_types | Supported order types |
| **Account** | get_account() | Get account info |
| | get_positions() | Get all positions |
| **Orders** | submit_order(code, side, qty, price, type) | Submit single order |
| | cancel_order(order_id) | Cancel order |
| | get_order(order_id) | Get order status |
| | get_orders(status) | Get order list |
| | submit_orders(orders) | Batch submit (optional) |
| **Events** | on_order_update(callback) | Order status callback (optional) |
| | on_trade(callback) | Trade callback (optional) |

### Order Types

| Type | Code | Description |
|------|------|-------------|
| LIMIT | LIMIT | Limit order |
| MARKET | MARKET | Market order |
| TWAP | TWAP | Time-weighted average price |
| VWAP | VWAP | Volume-weighted average price |
| STOP | STOP | Stop loss order |
| ALGO | ALGO | Algorithm order |

### Order Sides

| Side | Code | Description |
|------|------|-------------|
| BUY | BUY | Buy to open (long) |
| SELL | SELL | Sell to close (long) |
| SHORT | SHORT | Sell to open (short) |
| COVER | COVER | Buy to close (short) |

### Order Status

| Status | Code | Description |
|--------|------|-------------|
| PENDING | PENDING | Not yet submitted |
| SUBMITTED | SUBMITTED | Submitted to exchange |
| ACCEPTED | ACCEPTED | Accepted by exchange |
| PARTIAL | PARTIAL | Partially filled |
| FILLED | FILLED | Fully filled |
| CANCELLED | CANCELLED | Cancelled |
| REJECTED | REJECTED | Rejected |
| EXPIRED | EXPIRED | Expired |

### Time in Force

| Type | Code | Description |
|------|------|-------------|
| DAY | DAY | Good for day |
| GTC | GTC | Good till cancelled |
| IOC | IOC | Immediate or cancel |
| FOK | FOK | Fill or kill |

### Available Implementations

| Plugin | Channel | Assets | Order Types |
|--------|---------|--------|-------------|
| xuanye | Xuanye | Stock, ETF | LIMIT, TWAP, VWAP |
| renrui | Renrui | Stock, ETF | LIMIT, TWAP, VWAP |
| jinxin | Jinxin | Stock, ETF | LIMIT |
| huatai_oes | Huatai OES | Stock, ETF, Option | LIMIT, MARKET |
| citic | CITIC | Stock, ETF | LIMIT |
| ctp | CTP | Future, Option | LIMIT, MARKET |
| simulate | Simulation | All | All |

---

## 3. Plugin Registration

### Registration Methods

1. **Decorator-based** - Use decorators to auto-register
2. **Config-based** - Register via configuration file
3. **Manual** - Programmatic registration

### Plugin Discovery

Plugins are discovered from:
1. Built-in plugins directory
2. User plugins directory
3. Installed packages with entry points

### Configuration

```yaml
# config/plugins.yaml

data_providers:
  - name: wind_api
    config:
      terminal_id: "xxx"
      
  - name: tushare
    config:
      token: "xxx"

trade_executors:
  - name: xuanye
    config:
      api_url: "https://xuanye.api.com"
      account_id: "ACC001"
      api_key: "${XUANYE_API_KEY}"
      
  - name: ctp
    config:
      front_addr: "tcp://180.168.146.187:10130"
      broker_id: "9999"
      user_id: "${CTP_USER}"
      password: "${CTP_PASS}"
```

---

## 4. Plugin Development Guide

### Creating a Data Provider Plugin

1. Implement the DataProvider interface
2. Register with decorator or config
3. Handle connection, authentication
4. Implement required methods
5. Handle errors gracefully
6. Add to plugin registry

### Creating a Trade Executor Plugin

1. Implement the TradeExecutor interface
2. Register with decorator or config
3. Handle connection, authentication
4. Implement account/position/order methods
5. Handle async callbacks (optional)
6. Implement reconciliation support
7. Add to plugin registry

### Best Practices

| Practice | Description |
|----------|-------------|
| Error Handling | Wrap API errors, provide clear messages |
| Logging | Log all API calls, responses, errors |
| Retry | Implement retry for transient failures |
| Rate Limiting | Respect API rate limits |
| Connection Pool | Reuse connections when possible |
| Graceful Shutdown | Clean up resources on shutdown |
| Testing | Provide mock/simulation mode |

---

## 5. Plugin Lifecycle

```
Load -> Configure -> Initialize -> Ready -> Active -> Shutdown

  |        |           |           |        |          |
  v        v           v           v        v          v
Discover  Validate   Connect    Health   Process    Cleanup
          Config     Auth       Check    Requests   Resources
```

### States

| State | Description |
|-------|-------------|
| LOADING | Plugin being loaded |
| CONFIGURING | Reading configuration |
| INITIALIZING | Establishing connections |
| READY | Ready to accept requests |
| ACTIVE | Processing requests |
| ERROR | Error state |
| SHUTDOWN | Shutting down |
