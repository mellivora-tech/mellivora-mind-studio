-- =============================================================================
-- Mellivora Mind Studio - Scheduler and Configuration Schema
-- =============================================================================

-- =============================================================================
-- Configuration
-- =============================================================================

CREATE TABLE configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    namespace VARCHAR(50) NOT NULL,  -- e.g., 'global', 'account:xxx', 'service:xxx'
    key VARCHAR(100) NOT NULL,
    value JSONB NOT NULL,
    
    description TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    
    is_secret BOOLEAN NOT NULL DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    UNIQUE(namespace, key)
);

CREATE INDEX idx_configs_namespace ON configs(namespace);

-- Config history (audit trail)
CREATE TABLE config_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    config_id UUID NOT NULL REFERENCES configs(id) ON DELETE CASCADE,
    
    old_value JSONB,
    new_value JSONB NOT NULL,
    version INTEGER NOT NULL,
    
    changed_by VARCHAR(100),
    change_reason TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_config_history_config ON config_history(config_id, created_at);

-- =============================================================================
-- Scheduled Tasks
-- =============================================================================

CREATE TYPE task_status AS ENUM ('pending', 'running', 'completed', 'failed', 'cancelled', 'skipped');

CREATE TABLE scheduled_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    
    -- Schedule (cron expression)
    cron_expression VARCHAR(100) NOT NULL,
    timezone VARCHAR(50) NOT NULL DEFAULT 'Asia/Shanghai',
    
    -- Task configuration
    task_type VARCHAR(50) NOT NULL,  -- e.g., 'data_update', 'optimization', 'trading'
    task_config JSONB NOT NULL DEFAULT '{}',
    
    -- Dependencies
    depends_on UUID[],  -- Task IDs that must complete first
    
    -- Retry configuration
    max_retries INTEGER NOT NULL DEFAULT 3,
    retry_delay_seconds INTEGER NOT NULL DEFAULT 60,
    
    -- Timeout
    timeout_seconds INTEGER NOT NULL DEFAULT 3600,
    
    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_run_at TIMESTAMP WITH TIME ZONE,
    next_run_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_scheduled_tasks_active ON scheduled_tasks(is_active, next_run_at);

-- Task executions
CREATE TABLE task_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES scheduled_tasks(id) ON DELETE CASCADE,
    
    status task_status NOT NULL DEFAULT 'pending',
    
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Execution details
    attempt INTEGER NOT NULL DEFAULT 1,
    error_message TEXT,
    result JSONB,
    
    -- Logs
    logs TEXT[],
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_task_executions_task ON task_executions(task_id, created_at);
CREATE INDEX idx_task_executions_status ON task_executions(status, created_at);

-- =============================================================================
-- Alerts
-- =============================================================================

CREATE TYPE alert_severity AS ENUM ('info', 'warning', 'error', 'critical');
CREATE TYPE alert_status AS ENUM ('active', 'acknowledged', 'resolved');

CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    severity alert_severity NOT NULL,
    status alert_status NOT NULL DEFAULT 'active',
    
    -- Source
    source VARCHAR(50) NOT NULL,  -- e.g., 'risk_engine', 'trading', 'data_update'
    source_id VARCHAR(100),  -- e.g., account_id, task_id
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    triggered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    acknowledged_by VARCHAR(100),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by VARCHAR(100),
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alerts_status ON alerts(status, triggered_at);
CREATE INDEX idx_alerts_severity ON alerts(severity, triggered_at);
CREATE INDEX idx_alerts_source ON alerts(source, source_id);

-- Alert rules
CREATE TABLE alert_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    
    -- Condition
    source VARCHAR(50) NOT NULL,
    condition JSONB NOT NULL,  -- Rule definition
    
    -- Action
    severity alert_severity NOT NULL,
    channels TEXT[] NOT NULL,  -- e.g., ['feishu', 'email']
    
    -- Throttling
    cooldown_seconds INTEGER NOT NULL DEFAULT 300,
    
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- Audit Log
-- =============================================================================

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Who
    user_id VARCHAR(100),
    user_name VARCHAR(100),
    ip_address INET,
    
    -- What
    action VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id VARCHAR(100),
    
    -- Details
    old_value JSONB,
    new_value JSONB,
    
    -- When
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id, created_at);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id, created_at);
CREATE INDEX idx_audit_logs_action ON audit_logs(action, created_at);

-- =============================================================================
-- Triggers
-- =============================================================================

CREATE TRIGGER update_configs_updated_at
    BEFORE UPDATE ON configs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scheduled_tasks_updated_at
    BEFORE UPDATE ON scheduled_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_alert_rules_updated_at
    BEFORE UPDATE ON alert_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
