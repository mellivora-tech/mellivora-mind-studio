// ETL 配置类型定义

// ============================================================================
// 数据源 (DataSource)
// ============================================================================

export type DataSourceType = 'api' | 'database' | 'file' | 'message_queue'
export type DataSourceStatus = 'active' | 'inactive' | 'error'

export interface DataSource {
  id: string
  name: string
  type: DataSourceType
  plugin: string
  description?: string
  config: Record<string, unknown>
  capabilities: string[]
  status: DataSourceStatus
  lastSyncAt?: string
  createdAt: string
  updatedAt: string
}

export interface DataSourceFormData {
  name: string
  type: DataSourceType
  plugin: string
  description?: string
  config: Record<string, unknown>
  capabilities: string[]
}

// ============================================================================
// 数据集 (DataSet)
// ============================================================================

export type FieldType = 
  | 'string' 
  | 'int' 
  | 'bigint' 
  | 'decimal' 
  | 'float' 
  | 'double'
  | 'bool' 
  | 'date' 
  | 'datetime' 
  | 'json' 
  | 'enum'

export type StorageType = 'postgres' | 'clickhouse' | 'redis'

export interface FieldDefinition {
  name: string
  type: FieldType
  precision?: number
  scale?: number
  enumValues?: string[]
  primary: boolean
  nullable: boolean
  default?: unknown
  description?: string
}

export interface IndexDefinition {
  name?: string
  fields: string[]
  unique?: boolean
}

export interface StorageConfig {
  type: StorageType
  table: string
  partitionBy?: string
  orderBy?: string[]
  ttlDays?: number
}

export interface DataSet {
  id: string
  name: string
  version: number
  category: string
  description?: string
  schema: {
    fields: FieldDefinition[]
  }
  storage: StorageConfig
  indexes: IndexDefinition[]
  labels: Record<string, string>
  status: 'active' | 'inactive' | 'migrating'
  createdAt: string
  updatedAt: string
}

export interface DataSetVersion {
  id: string
  datasetId: string
  version: number
  schema: { fields: FieldDefinition[] }
  migrationSql?: string
  appliedAt?: string
  createdAt: string
}

// ============================================================================
// 管道 (Pipeline)
// ============================================================================

export type StepType = 'extract' | 'transform' | 'load'
export type ErrorHandling = 'skip_row' | 'fail' | 'default_value'

export interface PipelineStep {
  id: string
  name: string
  type: StepType
  plugin: string
  config: Record<string, unknown>
  input?: string
  output?: string
  parallel?: boolean
  onError?: ErrorHandling
}

export interface PipelineTrigger {
  type: 'schedule' | 'manual' | 'event'
  schedule?: string
  timezone?: string
  conditions?: Array<{
    type: string
    params: Record<string, unknown>
  }>
}

export interface Pipeline {
  id: string
  name: string
  version: number
  description?: string
  trigger: PipelineTrigger
  parameters: Array<{
    name: string
    type: string
    default?: unknown
    required?: boolean
  }>
  steps: PipelineStep[]
  status: 'active' | 'inactive' | 'draft'
  createdAt: string
  updatedAt: string
}

// ============================================================================
// 调度 (Schedule)
// ============================================================================

export interface DAGNode {
  id: string
  name: string
  pipelineId: string
  dependsOn: string[]
  params?: Record<string, unknown>
  timeout?: number
  retries?: number
}

export interface Schedule {
  id: string
  name: string
  description?: string
  cronExpr: string
  timezone: string
  enabled: boolean
  dag: DAGNode[]
  lastRunAt?: string
  nextRunAt?: string
  createdAt: string
  updatedAt: string
}

// ============================================================================
// 执行 (Execution)
// ============================================================================

export type ExecutionStatus = 
  | 'pending' 
  | 'running' 
  | 'success' 
  | 'failed' 
  | 'cancelled'

export interface TaskExecution {
  id: string
  nodeId: string
  nodeName: string
  status: ExecutionStatus
  startedAt?: string
  finishedAt?: string
  inputRows?: number
  outputRows?: number
  errorCount?: number
  error?: string
}

export interface Execution {
  id: string
  scheduleId?: string
  scheduleName?: string
  pipelineId?: string
  pipelineName?: string
  status: ExecutionStatus
  trigger: 'scheduled' | 'manual' | 'retry'
  startedAt?: string
  finishedAt?: string
  duration?: number
  params?: Record<string, unknown>
  tasks: TaskExecution[]
  createdAt: string
}

// ============================================================================
// 插件 (Plugin)
// ============================================================================

export interface PluginConfigField {
  name: string
  type: 'string' | 'number' | 'boolean' | 'select' | 'secret' | 'json'
  label: string
  description?: string
  required?: boolean
  default?: unknown
  options?: Array<{ label: string; value: string }>
}

export interface Plugin {
  name: string
  type: 'extract' | 'transform' | 'load'
  displayName: string
  description?: string
  configSchema: PluginConfigField[]
  capabilities?: string[]
}

// ============================================================================
// API 响应
// ============================================================================

export interface ApiResponse<T> {
  data: T
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}
