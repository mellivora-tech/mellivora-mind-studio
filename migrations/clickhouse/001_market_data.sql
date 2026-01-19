-- =============================================================================
-- Mellivora Mind Studio - ClickHouse Market Data Schema
-- =============================================================================

-- =============================================================================
-- Stock Daily OHLCV
-- =============================================================================

CREATE TABLE IF NOT EXISTS stock_daily
(
    code String,
    exchange Enum8('sse' = 1, 'szse' = 2, 'bse' = 3, 'hkex' = 4),
    date Date,
    
    open Decimal(20, 4),
    high Decimal(20, 4),
    low Decimal(20, 4),
    close Decimal(20, 4),
    volume Decimal(20, 4),
    amount Decimal(20, 4),
    
    -- Adjustment factors
    adj_factor Decimal(20, 8) DEFAULT 1.0,
    
    -- Limits
    upper_limit Decimal(20, 4),
    lower_limit Decimal(20, 4),
    
    -- Status
    is_suspended UInt8 DEFAULT 0,
    is_st UInt8 DEFAULT 0,
    
    -- Metadata
    updated_at DateTime DEFAULT now()
)
ENGINE = ReplacingMergeTree(updated_at)
PARTITION BY toYYYYMM(date)
ORDER BY (code, exchange, date);

-- =============================================================================
-- Index Daily OHLCV
-- =============================================================================

CREATE TABLE IF NOT EXISTS index_daily
(
    code String,
    exchange Enum8('sse' = 1, 'szse' = 2, 'cffex' = 5),
    date Date,
    
    open Decimal(20, 4),
    high Decimal(20, 4),
    low Decimal(20, 4),
    close Decimal(20, 4),
    volume Decimal(20, 4),
    amount Decimal(20, 4),
    
    updated_at DateTime DEFAULT now()
)
ENGINE = ReplacingMergeTree(updated_at)
PARTITION BY toYYYYMM(date)
ORDER BY (code, exchange, date);

-- =============================================================================
-- Future Daily OHLCV
-- =============================================================================

CREATE TABLE IF NOT EXISTS future_daily
(
    code String,
    exchange Enum8('cffex' = 5, 'shfe' = 6, 'dce' = 7, 'czce' = 8, 'ine' = 9, 'gfex' = 10),
    date Date,
    
    open Decimal(20, 4),
    high Decimal(20, 4),
    low Decimal(20, 4),
    close Decimal(20, 4),
    settle Decimal(20, 4),
    volume Decimal(20, 4),
    amount Decimal(20, 4),
    open_interest Decimal(20, 4),
    
    updated_at DateTime DEFAULT now()
)
ENGINE = ReplacingMergeTree(updated_at)
PARTITION BY toYYYYMM(date)
ORDER BY (code, exchange, date);

-- =============================================================================
-- Option Daily
-- =============================================================================

CREATE TABLE IF NOT EXISTS option_daily
(
    code String,
    underlying_code String,
    exchange Enum8('sse' = 1, 'szse' = 2, 'cffex' = 5),
    date Date,
    
    open Decimal(20, 4),
    high Decimal(20, 4),
    low Decimal(20, 4),
    close Decimal(20, 4),
    settle Decimal(20, 4),
    volume Decimal(20, 4),
    amount Decimal(20, 4),
    open_interest Decimal(20, 4),
    
    -- Option specific
    strike Decimal(20, 4),
    option_type Enum8('call' = 1, 'put' = 2),
    expire_date Date,
    
    -- Greeks
    delta Decimal(10, 6),
    gamma Decimal(10, 6),
    theta Decimal(10, 6),
    vega Decimal(10, 6),
    implied_vol Decimal(10, 6),
    
    updated_at DateTime DEFAULT now()
)
ENGINE = ReplacingMergeTree(updated_at)
PARTITION BY toYYYYMM(date)
ORDER BY (code, exchange, date);

-- =============================================================================
-- Index Weights
-- =============================================================================

CREATE TABLE IF NOT EXISTS index_weights
(
    index_code String,
    stock_code String,
    stock_exchange Enum8('sse' = 1, 'szse' = 2, 'bse' = 3),
    date Date,
    
    weight Decimal(10, 6),
    
    updated_at DateTime DEFAULT now()
)
ENGINE = ReplacingMergeTree(updated_at)
PARTITION BY toYYYYMM(date)
ORDER BY (index_code, date, stock_code);

-- =============================================================================
-- Factor Exposures
-- =============================================================================

CREATE TABLE IF NOT EXISTS factor_exposures
(
    code String,
    exchange Enum8('sse' = 1, 'szse' = 2, 'bse' = 3),
    date Date,
    
    -- Style factors (Barra)
    size Decimal(10, 6),
    beta Decimal(10, 6),
    momentum Decimal(10, 6),
    residual_vol Decimal(10, 6),
    non_linear_size Decimal(10, 6),
    book_to_price Decimal(10, 6),
    liquidity Decimal(10, 6),
    earnings_yield Decimal(10, 6),
    growth Decimal(10, 6),
    leverage Decimal(10, 6),
    
    -- Industry (CITIC Level 1, stored as map)
    industry_code String,
    
    -- Specific risk
    specific_risk Decimal(10, 6),
    
    updated_at DateTime DEFAULT now()
)
ENGINE = ReplacingMergeTree(updated_at)
PARTITION BY toYYYYMM(date)
ORDER BY (code, exchange, date);

-- =============================================================================
-- Factor Covariance Matrix
-- =============================================================================

CREATE TABLE IF NOT EXISTS factor_covariance
(
    date Date,
    factor1 String,
    factor2 String,
    
    covariance Decimal(20, 12),
    
    updated_at DateTime DEFAULT now()
)
ENGINE = ReplacingMergeTree(updated_at)
PARTITION BY toYYYYMM(date)
ORDER BY (date, factor1, factor2);

-- =============================================================================
-- Factor Returns
-- =============================================================================

CREATE TABLE IF NOT EXISTS factor_returns
(
    date Date,
    factor_name String,
    
    factor_return Decimal(10, 8),
    t_stat Decimal(10, 4),
    
    updated_at DateTime DEFAULT now()
)
ENGINE = ReplacingMergeTree(updated_at)
PARTITION BY toYYYYMM(date)
ORDER BY (date, factor_name);

-- =============================================================================
-- Real-time Tracking (for intraday data)
-- =============================================================================

CREATE TABLE IF NOT EXISTS realtime_portfolio_pnl
(
    account_id String,
    timestamp DateTime,
    
    total_pnl Decimal(20, 4),
    benchmark_return Decimal(10, 8),
    excess_return Decimal(10, 8),
    
    -- By category
    stock_pnl Decimal(20, 4),
    future_pnl Decimal(20, 4),
    option_pnl Decimal(20, 4),
    
    updated_at DateTime DEFAULT now()
)
ENGINE = ReplacingMergeTree(updated_at)
PARTITION BY toYYYYMMDD(timestamp)
ORDER BY (account_id, timestamp);

-- =============================================================================
-- Trading Calendar
-- =============================================================================

CREATE TABLE IF NOT EXISTS trading_calendar
(
    market String,  -- A_SHARE, HK, FUTURES
    date Date,
    is_trading_day UInt8,
    
    updated_at DateTime DEFAULT now()
)
ENGINE = ReplacingMergeTree(updated_at)
ORDER BY (market, date);
