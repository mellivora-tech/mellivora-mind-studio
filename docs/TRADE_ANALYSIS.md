# Mellivora Mind Studio - Trade Analysis Engine

## Overview

The Trade Analysis Engine manages the complete trading lifecycle:
Account -> Position -> Order -> Deal

```
+-----------------------------------------------------------------------------------+
|                                                                                   |
|                         Trade Analysis Engine                                     |
|                                                                                   |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|   Account (1) -----> Position (N) -----> Order (N) -----> Deal (N)               |
|                                                                                   |
|   - Multi-account    - Multi-asset      - Full lifecycle  - Execution detail     |
|   - Cash management  - Cost tracking    - Smart routing   - Fee calculation      |
|   - Risk monitoring  - P&L calculation  - Order splitting - Reconciliation       |
|                                                                                   |
+-----------------------------------------------------------------------------------+
```

---

## 1. Account Model

### Attributes

| Category | Attribute | Description |
|----------|-----------|-------------|
| **Basic** | account_id | Account identifier |
| | account_name | Account name |
| | account_type | Type: securities/futures/options |
| | broker | Broker/channel |
| | status | Active/suspended/closed |
| | created_at | Opening date |
| **Cash** | total_asset | Total assets |
| | cash_balance | Cash balance |
| | available_cash | Available funds |
| | frozen_cash | Frozen funds |
| | market_value | Position market value |
| | margin_used | Used margin (derivatives) |
| | margin_available | Available margin |
| **Risk** | risk_level | Risk classification |
| | leverage | Leverage ratio |
| | max_drawdown | Maximum drawdown |
| | warning_line | Warning threshold |
| | close_line | Forced close threshold |
| **Stats** | total_pnl | Cumulative P&L |
| | today_pnl | Today's P&L |
| | realized_pnl | Realized P&L |
| | unrealized_pnl | Unrealized P&L |
| | commission | Cumulative commission |
| | turnover_rate | Turnover rate |

### Account Analysis Functions

| Function | Metrics |
|----------|---------|
| NAV Curve | Daily NAV, fund flow, deposits/withdrawals, utilization |
| Return Analysis | Annualized return, Sharpe ratio, max drawdown, IR |
| Risk Analysis | Volatility, VaR, Beta, stress test |
| Cost Analysis | Commission stats, stamp duty, slippage, impact cost |

---

## 2. Position Model

### Attributes

| Category | Attribute | Description |
|----------|-----------|-------------|
| **Basic** | position_id | Position identifier |
| | account_id | Parent account |
| | code | Security code |
| | name | Security name |
| | asset_type | stock/etf/future/option/bond |
| | direction | Long/Short |
| | exchange | Exchange |
| **Quantity** | quantity | Total quantity |
| | available_qty | Available for trading |
| | frozen_qty | Frozen quantity |
| | today_buy_qty | Today's buys |
| | today_sell_qty | Today's sells |
| | lock_qty | Locked for pending orders |
| **Price** | cost_price | Cost basis |
| | avg_price | Average price |
| | last_price | Current price |
| | open_price | Opening price |
| | settle_price | Settlement price (futures) |
| **P&L** | market_value | Market value |
| | total_pnl | Position P&L |
| | pnl_ratio | P&L percentage |
| | today_pnl | Today's P&L |
| | realized_pnl | Realized P&L |
| | unrealized_pnl | Floating P&L |
| **Derivatives** | margin | Margin required |
| | contract_mult | Contract multiplier |
| | expire_date | Expiration date |
| | strike_price | Strike price (options) |
| | option_type | Call/Put |
| | delta/gamma/theta | Greeks |

### Position Analysis Functions

| Function | Metrics |
|----------|---------|
| Concentration | Single stock weight, Top10, HHI index, liquidity |
| Industry Distribution | Industry weights, deviation from benchmark |
| Risk Exposure | Factor exposure, Beta, style tilts |
| Change Tracking | Position history, trade records, holding period |

---

## 3. Order Model

### Attributes

| Category | Attribute | Description |
|----------|-----------|-------------|
| **Basic** | order_id | Order identifier |
| | account_id | Parent account |
| | code | Security code |
| | name | Security name |
| | side | BUY/SELL/SHORT/COVER |
| | exchange | Exchange |
| **Order Type** | order_type | LIMIT/MARKET/TWAP/VWAP/STOP/ALGO |
| | time_in_force | DAY/GTC/IOC/FOK |
| **Quantity/Price** | quantity | Order quantity |
| | price | Order price |
| | filled_qty | Filled quantity |
| | filled_amt | Filled amount |
| | avg_price | Average fill price |
| | unfilled_qty | Remaining quantity |
| **Status** | status | PENDING/SUBMITTED/ACCEPTED/PARTIAL/FILLED/CANCELLED/REJECTED/EXPIRED |
| **Time** | create_time | Creation time |
| | submit_time | Submission time |
| | update_time | Last update time |
| | finish_time | Completion time |
| | cancel_time | Cancellation time |
| **Reference** | strategy_id | Strategy reference |
| | signal_id | Signal reference |
| | parent_order_id | Parent order (for splits) |
| | ref_order_id | Related order |
| | remark | Notes |

### Order Lifecycle

```
Create -> Validate -> Split -> Submit -> Track -> Complete/Cancel

   |         |         |        |        |         |
   v         v         v        v        v         v
Signal    Risk     Algorithm  Route   Status    Settle
         Check     Splitting  Select   Sync     Archive
```

### Order Analysis Functions

| Function | Metrics |
|----------|---------|
| Execution Analysis | Fill rate, completion rate, cancel rate, rejection reasons |
| Slippage Analysis | Price slippage, impact cost, VWAP deviation |
| Time Analysis | Average duration, queue time, fill distribution |
| Splitting Analysis | Split efficiency, child order distribution, channel allocation |

---

## 4. Deal Model

### Attributes

| Category | Attribute | Description |
|----------|-----------|-------------|
| **Basic** | deal_id | Deal identifier |
| | order_id | Parent order |
| | account_id | Parent account |
| | code | Security code |
| | name | Security name |
| | side | Direction |
| | exchange | Exchange |
| **Deal** | quantity | Deal quantity |
| | price | Deal price |
| | amount | Deal amount |
| | deal_time | Deal time |
| | deal_type | NORMAL/MATCH/BLOCK |
| **Fees** | commission | Commission |
| | stamp_duty | Stamp duty |
| | transfer_fee | Transfer fee |
| | other_fee | Other fees |
| | total_fee | Total fees |
| **Stats** | market_price | Market price at deal time |
| | slippage | Slippage |
| | impact_cost | Market impact |
| | vwap_price | Period VWAP |
| | vwap_deviation | VWAP deviation |

### Deal Analysis Functions

| Function | Metrics |
|----------|---------|
| Deal Quality | Price improvement, execution efficiency, market impact |
| Cost Analysis | Fee breakdown, fee rates, cost attribution |
| Time Distribution | Time of day distribution, deal density |
| Counterparty Analysis | Counterparty, active/passive, large order analysis |

---

## 5. Data Flow

```
Signal
   |
   v
+-------+      +-------+
| Order | ---> | Validate | Cash/Position/Risk checks
+-------+      +-------+
                  |
                  v
             +-------+
             | Split | Smart order splitting
             +-------+
                  |
      +-----------+-----------+
      v           v           v
+----------+ +----------+ +----------+
| Child 1  | | Child 2  | | Child 3  |  Route to channels
+----------+ +----------+ +----------+
      |           |           |
      v           v           v
+------------------------------------------+
|           Trading Channel Plugin          |
|   Xuanye   |   Renrui   |   Jinxin       |
+------------------------------------------+
                  |
                  v
+------------------------------------------+
|              Deal Callback                |
+------------------------------------------+
                  |
      +-----------+-----------+
      v                       v
+----------+            +----------+
| Position |            | Account  |
|  Update  |            |  Update  |
| - Qty    |            | - Cash   |
| - Cost   |            | - Frozen |
| - P&L    |            | - P&L    |
+----------+            +----------+
```

---

## 6. Plugin Interface Summary

### TradeExecutor Interface

| Category | Method | Description |
|----------|--------|-------------|
| **Properties** | name | Channel name |
| | supported_assets | Supported asset types |
| | supported_order_types | Supported order types |
| **Account** | get_account() | Get account info |
| | get_positions() | Get position list |
| **Orders** | submit_order() | Submit order |
| | cancel_order() | Cancel order |
| | get_order() | Query order |
| | get_orders() | Query order list |
| | submit_orders() | Batch submit (optional) |
| **Events** | on_order_update() | Order status callback |
| | on_trade() | Trade callback |

### Supported Trading Channels

| Category | Channels |
|----------|----------|
| Securities | Xuanye, Renrui, Jinxin, Huatai, CITIC, Hengsheng UFT |
| Futures | CTP, Femas, Esunny |
| Other | Simulation |
