-- =============================================================================
-- Mellivora Mind Studio - Risk and Signals Schema
-- =============================================================================

-- =============================================================================
-- Risk Limits
-- =============================================================================

CREATE TYPE risk_limit_type AS ENUM ('factor', 'industry', 'stock', 'tracking_error', 'turnover', 'concentration');

CREATE TABLE risk_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    
    limit_type risk_limit_type NOT NULL,
    target VARCHAR(50) NOT NULL,  -- factor name, industry code, stock code, etc.
    min_value DECIMAL(10, 6),
    max_value DECIMAL(10, 6),
    
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    UNIQUE(account_id, limit_type, target)
);

CREATE INDEX idx_risk_limits_account ON risk_limits(account_id);

-- Risk limit breaches
CREATE TABLE risk_limit_breaches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    limit_id UUID NOT NULL REFERENCES risk_limits(id) ON DELETE CASCADE,
    
    breach_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    current_value DECIMAL(10, 6) NOT NULL,
    limit_value DECIMAL(10, 6) NOT NULL,
    severity VARCHAR(20) NOT NULL,  -- warning, breach
    resolved BOOLEAN NOT NULL DEFAULT false,
    resolved_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_risk_breaches_account ON risk_limit_breaches(account_id, breach_time);

-- =============================================================================
-- Stress Test Scenarios
-- =============================================================================

CREATE TABLE stress_scenarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    
    factor_shocks JSONB NOT NULL DEFAULT '{}',  -- factor_name -> shock percentage
    index_shocks JSONB NOT NULL DEFAULT '{}',   -- index_code -> shock percentage
    
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- Signals
-- =============================================================================

CREATE TYPE timing_level AS ENUM ('L0', 'L1', 'L2', 'L3');

-- Timing signals
CREATE TABLE timing_signals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    level timing_level NOT NULL,
    date DATE NOT NULL,
    
    value DECIMAL(10, 6) NOT NULL,
    position DECIMAL(10, 6) NOT NULL,  -- Target position 0-1
    regime VARCHAR(20),  -- BULL, BEAR, NEUTRAL
    
    components JSONB DEFAULT '{}',  -- Sub-signal values
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    UNIQUE(level, date)
);

CREATE INDEX idx_timing_signals_date ON timing_signals(date);

-- Alpha signals (stock scores)
CREATE TABLE alpha_signals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE alpha_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    signal_id UUID NOT NULL REFERENCES alpha_signals(id) ON DELETE CASCADE,
    
    code VARCHAR(20) NOT NULL,
    exchange exchange NOT NULL,
    
    raw_score DECIMAL(10, 6) NOT NULL,
    normalized_score DECIMAL(10, 6) NOT NULL,
    percentile DECIMAL(10, 6) NOT NULL,
    
    factor_scores JSONB DEFAULT '{}',  -- Individual factor scores
    
    UNIQUE(signal_id, code, exchange)
);

CREATE INDEX idx_alpha_scores_signal ON alpha_scores(signal_id);
CREATE INDEX idx_alpha_scores_code ON alpha_scores(code);

-- Combined signals
CREATE TABLE combined_signals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL UNIQUE,
    
    timing_position DECIMAL(10, 6) NOT NULL,
    
    source_signal_ids JSONB DEFAULT '[]',
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- Signal Backtests
-- =============================================================================

CREATE TABLE signal_backtests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    signal_type VARCHAR(20) NOT NULL,  -- timing, alpha, ml
    signal_name VARCHAR(50) NOT NULL,
    
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    universe VARCHAR(50),
    
    -- IC metrics
    ic DECIMAL(10, 6),
    rank_ic DECIMAL(10, 6),
    icir DECIMAL(10, 6),
    
    -- Turnover
    avg_turnover DECIMAL(10, 6),
    
    -- Detailed results
    group_returns JSONB DEFAULT '[]',
    decay_curve JSONB DEFAULT '[]',
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_signal_backtests_type ON signal_backtests(signal_type, signal_name);

-- =============================================================================
-- Triggers
-- =============================================================================

CREATE TRIGGER update_risk_limits_updated_at
    BEFORE UPDATE ON risk_limits
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stress_scenarios_updated_at
    BEFORE UPDATE ON stress_scenarios
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
