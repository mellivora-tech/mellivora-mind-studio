-- =============================================================================
-- Mellivora Mind Studio - Initial Database Schema
-- =============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For text search

-- =============================================================================
-- Enums
-- =============================================================================

CREATE TYPE account_type AS ENUM ('securities', 'futures', 'options', 'multi_asset');
CREATE TYPE account_status AS ENUM ('active', 'suspended', 'closed');
CREATE TYPE asset_type AS ENUM ('stock', 'etf', 'future', 'option', 'bond', 'convertible_bond', 'index', 'fund');
CREATE TYPE exchange AS ENUM ('sse', 'szse', 'bse', 'hkex', 'cffex', 'shfe', 'dce', 'czce', 'ine', 'gfex');
CREATE TYPE direction AS ENUM ('long', 'short');
CREATE TYPE order_side AS ENUM ('buy', 'sell', 'short', 'cover');
CREATE TYPE order_type AS ENUM ('limit', 'market', 'twap', 'vwap', 'stop', 'stop_limit', 'algo');
CREATE TYPE time_in_force AS ENUM ('day', 'gtc', 'ioc', 'fok');
CREATE TYPE order_status AS ENUM ('pending', 'submitted', 'accepted', 'partial', 'filled', 'cancelled', 'rejected', 'expired');
CREATE TYPE deal_type AS ENUM ('normal', 'match', 'block');

-- =============================================================================
-- Accounts
-- =============================================================================

CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_name VARCHAR(100) NOT NULL,
    account_type account_type NOT NULL,
    broker VARCHAR(50),
    channel VARCHAR(50),  -- Trading channel plugin name
    status account_status NOT NULL DEFAULT 'active',
    
    -- Cash
    total_asset DECIMAL(20, 4) NOT NULL DEFAULT 0,
    cash_balance DECIMAL(20, 4) NOT NULL DEFAULT 0,
    available_cash DECIMAL(20, 4) NOT NULL DEFAULT 0,
    frozen_cash DECIMAL(20, 4) NOT NULL DEFAULT 0,
    market_value DECIMAL(20, 4) NOT NULL DEFAULT 0,
    margin_used DECIMAL(20, 4) NOT NULL DEFAULT 0,
    margin_available DECIMAL(20, 4) NOT NULL DEFAULT 0,
    
    -- Risk parameters
    risk_level VARCHAR(20),
    leverage DECIMAL(10, 4) DEFAULT 1.0,
    max_drawdown DECIMAL(10, 6),
    warning_line DECIMAL(10, 6),
    close_line DECIMAL(10, 6),
    
    -- Statistics
    total_pnl DECIMAL(20, 4) NOT NULL DEFAULT 0,
    today_pnl DECIMAL(20, 4) NOT NULL DEFAULT 0,
    realized_pnl DECIMAL(20, 4) NOT NULL DEFAULT 0,
    unrealized_pnl DECIMAL(20, 4) NOT NULL DEFAULT 0,
    commission DECIMAL(20, 4) NOT NULL DEFAULT 0,
    turnover_rate DECIMAL(10, 6),
    
    -- Metadata
    labels JSONB DEFAULT '{}',
    config JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_accounts_status ON accounts(status);
CREATE INDEX idx_accounts_broker ON accounts(broker);
CREATE INDEX idx_accounts_channel ON accounts(channel);

-- Account NAV history
CREATE TABLE account_nav_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    nav DECIMAL(20, 8) NOT NULL,
    total_asset DECIMAL(20, 4) NOT NULL,
    cash_balance DECIMAL(20, 4) NOT NULL,
    market_value DECIMAL(20, 4) NOT NULL,
    daily_return DECIMAL(10, 8),
    cumulative_return DECIMAL(10, 8),
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    UNIQUE(account_id, date)
);

CREATE INDEX idx_account_nav_date ON account_nav_history(account_id, date);

-- =============================================================================
-- Positions
-- =============================================================================

CREATE TABLE positions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    
    -- Security identification
    code VARCHAR(20) NOT NULL,
    name VARCHAR(100),
    asset_type asset_type NOT NULL,
    exchange exchange NOT NULL,
    direction direction NOT NULL DEFAULT 'long',
    
    -- Quantity
    quantity DECIMAL(20, 4) NOT NULL DEFAULT 0,
    available_qty DECIMAL(20, 4) NOT NULL DEFAULT 0,
    frozen_qty DECIMAL(20, 4) NOT NULL DEFAULT 0,
    today_buy_qty DECIMAL(20, 4) NOT NULL DEFAULT 0,
    today_sell_qty DECIMAL(20, 4) NOT NULL DEFAULT 0,
    lock_qty DECIMAL(20, 4) NOT NULL DEFAULT 0,
    
    -- Price
    cost_price DECIMAL(20, 6) NOT NULL DEFAULT 0,
    avg_price DECIMAL(20, 6) NOT NULL DEFAULT 0,
    last_price DECIMAL(20, 6) NOT NULL DEFAULT 0,
    open_price DECIMAL(20, 6),
    settle_price DECIMAL(20, 6),
    
    -- P&L
    market_value DECIMAL(20, 4) NOT NULL DEFAULT 0,
    total_pnl DECIMAL(20, 4) NOT NULL DEFAULT 0,
    pnl_ratio DECIMAL(10, 6) NOT NULL DEFAULT 0,
    today_pnl DECIMAL(20, 4) NOT NULL DEFAULT 0,
    realized_pnl DECIMAL(20, 4) NOT NULL DEFAULT 0,
    unrealized_pnl DECIMAL(20, 4) NOT NULL DEFAULT 0,
    
    -- Derivatives specific
    margin DECIMAL(20, 4),
    contract_multiplier DECIMAL(10, 4),
    expire_date DATE,
    strike_price DECIMAL(20, 6),
    option_type VARCHAR(10),  -- CALL/PUT
    
    -- Greeks
    delta DECIMAL(10, 6),
    gamma DECIMAL(10, 6),
    theta DECIMAL(10, 6),
    vega DECIMAL(10, 6),
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    UNIQUE(account_id, code, exchange, direction)
);

CREATE INDEX idx_positions_account ON positions(account_id);
CREATE INDEX idx_positions_code ON positions(code);
CREATE INDEX idx_positions_asset_type ON positions(asset_type);

-- Position history (daily snapshots)
CREATE TABLE position_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    code VARCHAR(20) NOT NULL,
    exchange exchange NOT NULL,
    direction direction NOT NULL,
    quantity DECIMAL(20, 4) NOT NULL,
    weight DECIMAL(10, 6),
    market_value DECIMAL(20, 4) NOT NULL,
    cost_price DECIMAL(20, 6),
    last_price DECIMAL(20, 6),
    pnl DECIMAL(20, 4),
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_position_history_account_date ON position_history(account_id, date);
CREATE INDEX idx_position_history_code ON position_history(code, date);

-- =============================================================================
-- Orders
-- =============================================================================

CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    
    -- Security
    code VARCHAR(20) NOT NULL,
    name VARCHAR(100),
    exchange exchange NOT NULL,
    
    -- Order details
    side order_side NOT NULL,
    order_type order_type NOT NULL,
    time_in_force time_in_force NOT NULL DEFAULT 'day',
    
    -- Quantity/Price
    quantity DECIMAL(20, 4) NOT NULL,
    price DECIMAL(20, 6),
    filled_qty DECIMAL(20, 4) NOT NULL DEFAULT 0,
    filled_amount DECIMAL(20, 4) NOT NULL DEFAULT 0,
    avg_price DECIMAL(20, 6),
    unfilled_qty DECIMAL(20, 4) NOT NULL,
    
    -- Status
    status order_status NOT NULL DEFAULT 'pending',
    reject_reason TEXT,
    
    -- Timestamps
    create_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    submit_time TIMESTAMP WITH TIME ZONE,
    update_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    finish_time TIMESTAMP WITH TIME ZONE,
    cancel_time TIMESTAMP WITH TIME ZONE,
    
    -- References
    strategy_id VARCHAR(50),
    signal_id VARCHAR(50),
    parent_order_id UUID REFERENCES orders(id),
    ref_order_id VARCHAR(100),  -- External reference
    channel VARCHAR(50),
    remark TEXT,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_orders_account ON orders(account_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_code ON orders(code);
CREATE INDEX idx_orders_create_time ON orders(create_time);
CREATE INDEX idx_orders_parent ON orders(parent_order_id);

-- =============================================================================
-- Deals (Trade Executions)
-- =============================================================================

CREATE TABLE deals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    
    -- Security
    code VARCHAR(20) NOT NULL,
    name VARCHAR(100),
    exchange exchange NOT NULL,
    side order_side NOT NULL,
    
    -- Deal details
    quantity DECIMAL(20, 4) NOT NULL,
    price DECIMAL(20, 6) NOT NULL,
    amount DECIMAL(20, 4) NOT NULL,
    deal_time TIMESTAMP WITH TIME ZONE NOT NULL,
    deal_type deal_type NOT NULL DEFAULT 'normal',
    
    -- Fees
    commission DECIMAL(20, 4) NOT NULL DEFAULT 0,
    stamp_duty DECIMAL(20, 4) NOT NULL DEFAULT 0,
    transfer_fee DECIMAL(20, 4) NOT NULL DEFAULT 0,
    other_fee DECIMAL(20, 4) NOT NULL DEFAULT 0,
    total_fee DECIMAL(20, 4) NOT NULL DEFAULT 0,
    
    -- Execution quality
    market_price DECIMAL(20, 6),
    slippage DECIMAL(20, 6),
    impact_cost DECIMAL(20, 6),
    vwap_price DECIMAL(20, 6),
    vwap_deviation DECIMAL(10, 6),
    
    -- Reference
    channel VARCHAR(50),
    external_deal_id VARCHAR(100),  -- ID from trading channel
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_deals_order ON deals(order_id);
CREATE INDEX idx_deals_account ON deals(account_id);
CREATE INDEX idx_deals_code ON deals(code);
CREATE INDEX idx_deals_time ON deals(deal_time);

-- =============================================================================
-- Fee Configuration
-- =============================================================================

CREATE TABLE fee_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    broker VARCHAR(50) NOT NULL,
    account_type account_type NOT NULL,
    
    commission_rate DECIMAL(10, 8) NOT NULL DEFAULT 0.0003,
    min_commission DECIMAL(10, 4) NOT NULL DEFAULT 5.0,
    stamp_duty_rate DECIMAL(10, 8) NOT NULL DEFAULT 0.001,
    transfer_fee_rate DECIMAL(10, 8) NOT NULL DEFAULT 0.00002,
    stamp_duty_buy BOOLEAN NOT NULL DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    UNIQUE(broker, account_type)
);

-- =============================================================================
-- Target Portfolios
-- =============================================================================

CREATE TABLE target_portfolios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    cash_weight DECIMAL(10, 6) NOT NULL DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    UNIQUE(account_id, date)
);

CREATE TABLE target_portfolio_weights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    portfolio_id UUID NOT NULL REFERENCES target_portfolios(id) ON DELETE CASCADE,
    code VARCHAR(20) NOT NULL,
    exchange exchange NOT NULL,
    name VARCHAR(100),
    weight DECIMAL(10, 6) NOT NULL,
    quantity DECIMAL(20, 4),
    market_value DECIMAL(20, 4),
    
    UNIQUE(portfolio_id, code, exchange)
);

CREATE INDEX idx_target_weights_portfolio ON target_portfolio_weights(portfolio_id);

-- =============================================================================
-- Triggers for updated_at
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_accounts_updated_at
    BEFORE UPDATE ON accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_positions_updated_at
    BEFORE UPDATE ON positions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fee_configs_updated_at
    BEFORE UPDATE ON fee_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_target_portfolios_updated_at
    BEFORE UPDATE ON target_portfolios
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
