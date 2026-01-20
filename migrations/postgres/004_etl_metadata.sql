-- =============================================================================
-- Mellivora Mind Studio - ETL Metadata Schema
-- =============================================================================

-- =============================================================================
-- Enums for ETL
-- =============================================================================

CREATE TYPE datasource_type AS ENUM ('api', 'database', 'file', 'message_queue');
CREATE TYPE datasource_status AS ENUM ('active', 'inactive', 'error');
CREATE TYPE storage_type AS ENUM ('postgres', 'clickhouse', 'redis');
CREATE TYPE field_type AS ENUM (
    'string', 'int', 'bigint', 'decimal', 'float', 'double', 
    'bool', 'date', 'datetime', 'json', 'enum'
);
CREATE TYPE dataset_status AS ENUM ('active', 'inactive', 'migrating');
CREATE TYPE step_type AS ENUM ('extract', 'transform', 'load');
CREATE TYPE error_handling AS ENUM ('skip_row', 'fail', 'default_value');
CREATE TYPE pipeline_status AS ENUM ('active', 'inactive', 'draft');
CREATE TYPE trigger_type AS ENUM ('schedule', 'manual', 'event');
CREATE TYPE execution_status AS ENUM ('pending', 'running', 'success', 'failed', 'cancelled');
CREATE TYPE execution_trigger AS ENUM ('scheduled', 'manual', 'retry');
CREATE TYPE plugin_type AS ENUM ('extract', 'transform', 'load');

-- =============================================================================
-- ETL Plugins Registry
-- =============================================================================

CREATE TABLE etl_plugins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    type plugin_type NOT NULL,
    display_name VARCHAR(200) NOT NULL,
    description TEXT,
    version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
    config_schema JSONB NOT NULL DEFAULT '[]',
    capabilities TEXT[] DEFAULT '{}',
    enabled BOOLEAN NOT NULL DEFAULT true,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_etl_plugins_type ON etl_plugins(type);
CREATE INDEX idx_etl_plugins_enabled ON etl_plugins(enabled);

-- =============================================================================
-- Data Sources
-- =============================================================================

CREATE TABLE etl_datasources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    type datasource_type NOT NULL,
    plugin VARCHAR(100) NOT NULL REFERENCES etl_plugins(name),
    description TEXT,
    config JSONB NOT NULL DEFAULT '{}',
    capabilities TEXT[] DEFAULT '{}',
    status datasource_status NOT NULL DEFAULT 'inactive',
    last_sync_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_etl_datasources_type ON etl_datasources(type);
CREATE INDEX idx_etl_datasources_status ON etl_datasources(status);
CREATE INDEX idx_etl_datasources_plugin ON etl_datasources(plugin);

-- =============================================================================
-- Data Sets (Schema Definitions)
-- =============================================================================

CREATE TABLE etl_datasets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    version INTEGER NOT NULL DEFAULT 1,
    category VARCHAR(50) NOT NULL,
    description TEXT,
    schema JSONB NOT NULL,  -- { fields: [...] }
    storage JSONB NOT NULL,  -- { type, table, partitionBy, orderBy, ttlDays }
    indexes JSONB DEFAULT '[]',
    labels JSONB DEFAULT '{}',
    status dataset_status NOT NULL DEFAULT 'inactive',
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_etl_datasets_category ON etl_datasets(category);
CREATE INDEX idx_etl_datasets_status ON etl_datasets(status);
CREATE INDEX idx_etl_datasets_labels ON etl_datasets USING GIN(labels);

-- Dataset version history
CREATE TABLE etl_dataset_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dataset_id UUID NOT NULL REFERENCES etl_datasets(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    schema JSONB NOT NULL,
    migration_sql TEXT,
    applied_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    UNIQUE(dataset_id, version)
);

CREATE INDEX idx_etl_dataset_versions_dataset ON etl_dataset_versions(dataset_id);

-- =============================================================================
-- Pipelines
-- =============================================================================

CREATE TABLE etl_pipelines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    version INTEGER NOT NULL DEFAULT 1,
    description TEXT,
    trigger JSONB NOT NULL DEFAULT '{"type": "manual"}',  -- { type, schedule, timezone, conditions }
    parameters JSONB DEFAULT '[]',  -- [{ name, type, default, required }]
    steps JSONB NOT NULL DEFAULT '[]',  -- [{ id, name, type, plugin, config, input, output, parallel, onError }]
    status pipeline_status NOT NULL DEFAULT 'draft',
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_etl_pipelines_status ON etl_pipelines(status);

-- =============================================================================
-- Schedules (DAG-based)
-- =============================================================================

CREATE TABLE etl_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    cron_expr VARCHAR(50) NOT NULL,
    timezone VARCHAR(50) NOT NULL DEFAULT 'Asia/Shanghai',
    enabled BOOLEAN NOT NULL DEFAULT false,
    dag JSONB NOT NULL DEFAULT '[]',  -- [{ id, name, pipelineId, dependsOn, params, timeout, retries }]
    last_run_at TIMESTAMP WITH TIME ZONE,
    next_run_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_etl_schedules_enabled ON etl_schedules(enabled);
CREATE INDEX idx_etl_schedules_next_run ON etl_schedules(next_run_at);

-- =============================================================================
-- Executions
-- =============================================================================

CREATE TABLE etl_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    schedule_id UUID REFERENCES etl_schedules(id) ON DELETE SET NULL,
    schedule_name VARCHAR(100),
    pipeline_id UUID REFERENCES etl_pipelines(id) ON DELETE SET NULL,
    pipeline_name VARCHAR(100),
    status execution_status NOT NULL DEFAULT 'pending',
    trigger execution_trigger NOT NULL DEFAULT 'manual',
    params JSONB DEFAULT '{}',
    started_at TIMESTAMP WITH TIME ZONE,
    finished_at TIMESTAMP WITH TIME ZONE,
    duration INTEGER,  -- milliseconds
    error_message TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_etl_executions_schedule ON etl_executions(schedule_id);
CREATE INDEX idx_etl_executions_pipeline ON etl_executions(pipeline_id);
CREATE INDEX idx_etl_executions_status ON etl_executions(status);
CREATE INDEX idx_etl_executions_created ON etl_executions(created_at DESC);

-- Execution tasks (individual nodes in DAG)
CREATE TABLE etl_execution_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    execution_id UUID NOT NULL REFERENCES etl_executions(id) ON DELETE CASCADE,
    node_id VARCHAR(100) NOT NULL,
    node_name VARCHAR(100) NOT NULL,
    status execution_status NOT NULL DEFAULT 'pending',
    started_at TIMESTAMP WITH TIME ZONE,
    finished_at TIMESTAMP WITH TIME ZONE,
    input_rows BIGINT,
    output_rows BIGINT,
    error_count INTEGER DEFAULT 0,
    error TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_etl_execution_tasks_execution ON etl_execution_tasks(execution_id);
CREATE INDEX idx_etl_execution_tasks_status ON etl_execution_tasks(status);

-- Execution logs
CREATE TABLE etl_execution_logs (
    id BIGSERIAL PRIMARY KEY,
    execution_id UUID NOT NULL REFERENCES etl_executions(id) ON DELETE CASCADE,
    task_id UUID REFERENCES etl_execution_tasks(id) ON DELETE CASCADE,
    level VARCHAR(10) NOT NULL DEFAULT 'INFO',  -- DEBUG, INFO, WARN, ERROR
    message TEXT NOT NULL,
    metadata JSONB,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_etl_execution_logs_execution ON etl_execution_logs(execution_id);
CREATE INDEX idx_etl_execution_logs_task ON etl_execution_logs(task_id);
CREATE INDEX idx_etl_execution_logs_level ON etl_execution_logs(level);

-- =============================================================================
-- Triggers for updated_at
-- =============================================================================

CREATE TRIGGER update_etl_plugins_updated_at
    BEFORE UPDATE ON etl_plugins
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_etl_datasources_updated_at
    BEFORE UPDATE ON etl_datasources
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_etl_datasets_updated_at
    BEFORE UPDATE ON etl_datasets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_etl_pipelines_updated_at
    BEFORE UPDATE ON etl_pipelines
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_etl_schedules_updated_at
    BEFORE UPDATE ON etl_schedules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- Seed Default Plugins
-- =============================================================================

INSERT INTO etl_plugins (name, type, display_name, description, config_schema, capabilities) VALUES
-- Extract plugins
('source-tushare', 'extract', 'Tushare', 'Tushare 金融数据接口', 
 '[{"name": "token", "type": "secret", "label": "API Token", "required": true},
   {"name": "timeout", "type": "number", "label": "超时(秒)", "default": 30}]',
 ARRAY['daily_bar', 'minute_bar', 'tick', 'finance', 'index']),

('source-wind', 'extract', 'Wind', 'Wind 金融终端数据接口',
 '[{"name": "username", "type": "string", "label": "用户名", "required": true},
   {"name": "password", "type": "secret", "label": "密码", "required": true}]',
 ARRAY['daily_bar', 'minute_bar', 'tick', 'finance', 'factor']),

('source-csv', 'extract', 'CSV File', 'CSV 文件导入',
 '[{"name": "path", "type": "string", "label": "文件路径", "required": true},
   {"name": "encoding", "type": "select", "label": "编码", "default": "utf-8", "options": [{"label": "UTF-8", "value": "utf-8"}, {"label": "GBK", "value": "gbk"}]},
   {"name": "delimiter", "type": "string", "label": "分隔符", "default": ","}]',
 ARRAY['batch']),

('source-postgres', 'extract', 'PostgreSQL', 'PostgreSQL 数据库',
 '[{"name": "host", "type": "string", "label": "主机", "required": true},
   {"name": "port", "type": "number", "label": "端口", "default": 5432},
   {"name": "database", "type": "string", "label": "数据库", "required": true},
   {"name": "username", "type": "string", "label": "用户名", "required": true},
   {"name": "password", "type": "secret", "label": "密码", "required": true}]',
 ARRAY['query', 'cdc']),

('source-clickhouse', 'extract', 'ClickHouse', 'ClickHouse 数据库',
 '[{"name": "host", "type": "string", "label": "主机", "required": true},
   {"name": "port", "type": "number", "label": "端口", "default": 9000},
   {"name": "database", "type": "string", "label": "数据库", "required": true},
   {"name": "username", "type": "string", "label": "用户名"},
   {"name": "password", "type": "secret", "label": "密码"}]',
 ARRAY['query']),

-- Transform plugins
('transform-filter', 'transform', 'Filter', '数据过滤',
 '[{"name": "condition", "type": "string", "label": "过滤条件", "required": true, "description": "SQL WHERE 语法"}]',
 ARRAY['filter']),

('transform-map', 'transform', 'Map', '字段映射/转换',
 '[{"name": "mappings", "type": "json", "label": "字段映射", "required": true}]',
 ARRAY['map', 'rename', 'cast']),

('transform-join', 'transform', 'Join', '数据关联',
 '[{"name": "type", "type": "select", "label": "关联类型", "options": [{"label": "Inner", "value": "inner"}, {"label": "Left", "value": "left"}, {"label": "Right", "value": "right"}]},
   {"name": "on", "type": "string", "label": "关联条件", "required": true}]',
 ARRAY['join']),

('transform-aggregate', 'transform', 'Aggregate', '数据聚合',
 '[{"name": "groupBy", "type": "string", "label": "分组字段"},
   {"name": "aggregations", "type": "json", "label": "聚合函数", "required": true}]',
 ARRAY['aggregate', 'groupby']),

('transform-dedupe', 'transform', 'Deduplicate', '数据去重',
 '[{"name": "keys", "type": "string", "label": "去重键", "required": true},
   {"name": "keepFirst", "type": "boolean", "label": "保留第一条", "default": true}]',
 ARRAY['dedupe']),

-- Load plugins
('target-postgres', 'load', 'PostgreSQL', 'PostgreSQL 数据库写入',
 '[{"name": "host", "type": "string", "label": "主机", "required": true},
   {"name": "port", "type": "number", "label": "端口", "default": 5432},
   {"name": "database", "type": "string", "label": "数据库", "required": true},
   {"name": "username", "type": "string", "label": "用户名", "required": true},
   {"name": "password", "type": "secret", "label": "密码", "required": true},
   {"name": "mode", "type": "select", "label": "写入模式", "options": [{"label": "追加", "value": "append"}, {"label": "覆盖", "value": "overwrite"}, {"label": "更新", "value": "upsert"}]}]',
 ARRAY['batch', 'upsert']),

('target-clickhouse', 'load', 'ClickHouse', 'ClickHouse 数据库写入',
 '[{"name": "host", "type": "string", "label": "主机", "required": true},
   {"name": "port", "type": "number", "label": "端口", "default": 9000},
   {"name": "database", "type": "string", "label": "数据库", "required": true},
   {"name": "username", "type": "string", "label": "用户名"},
   {"name": "password", "type": "secret", "label": "密码"}]',
 ARRAY['batch']),

('target-csv', 'load', 'CSV File', 'CSV 文件导出',
 '[{"name": "path", "type": "string", "label": "输出路径", "required": true},
   {"name": "encoding", "type": "select", "label": "编码", "default": "utf-8", "options": [{"label": "UTF-8", "value": "utf-8"}, {"label": "GBK", "value": "gbk"}]}]',
 ARRAY['batch']);

-- =============================================================================
-- Seed Example Data Source Categories
-- =============================================================================

-- Add comment for dataset categories
COMMENT ON COLUMN etl_datasets.category IS 'Categories: market-data, factor-data, reference-data, trading-data, alternative-data';
