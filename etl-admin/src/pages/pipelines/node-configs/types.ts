// 节点配置类型定义

import type { DataSource } from '@/types/etl'

// ============================================================================
// 通用类型
// ============================================================================

export interface FieldInfo {
  name: string
  type: string
  nullable?: boolean
  comment?: string
}

export interface FilterCondition {
  id: string
  field: string
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'in' | 'between' | 'is_null' | 'not_null'
  value: string
  value2?: string // for 'between' operator
}

export interface SortConfig {
  field: string
  direction: 'asc' | 'desc'
}

export interface FieldMapping {
  sourceField: string
  targetField: string
  targetType: string
  format?: string
  selected: boolean
}

// ============================================================================
// Extract 配置类型
// ============================================================================

// CSV Source
export interface CsvSourceConfig {
  // 文件来源
  sourceType: 'upload' | 'url' | 'sftp' | 's3'
  
  // 上传文件
  uploadedFile?: File
  uploadedFileName?: string
  
  // URL
  url?: string
  urlHeaders?: Record<string, string>
  
  // S3
  s3Bucket?: string
  s3Region?: string
  s3Path?: string
  s3Pattern?: string
  
  // SFTP
  sftpHost?: string
  sftpPort?: number
  sftpUsername?: string
  sftpPassword?: string
  sftpPath?: string
  
  // 解析设置
  encoding: 'utf-8' | 'gbk' | 'gb2312' | 'latin1'
  delimiter: ',' | '\t' | ';' | '|' | string
  quoteChar: '"' | "'" | string
  hasHeader: boolean
  skipRows: number
  
  // 字段映射
  fields: FieldMapping[]
  
  // 预览数据
  previewData?: Record<string, any>[]
}

// PostgreSQL Source
export interface PostgresSourceConfig {
  // 数据源
  datasourceId: string
  datasource?: DataSource
  
  // 查询模式
  queryMode: 'sql' | 'visual'
  
  // SQL 模式
  sql?: string
  sqlParams?: Array<{
    name: string
    type: 'string' | 'number' | 'date' | 'datetime'
    defaultValue?: string
    required: boolean
  }>
  
  // 可视化模式
  schema?: string
  table?: string
  selectedFields?: string[]
  filters?: FilterCondition[]
  sorts?: SortConfig[]
  limit?: number
  
  // 增量配置
  incrementalEnabled: boolean
  incrementalField?: string
  incrementalMode?: 'timestamp' | 'id' | 'cdc'
  
  // 高级设置
  batchSize: number
  concurrency: number
  timeout: number
}

// ClickHouse Source
export interface ClickhouseSourceConfig {
  // 数据源
  datasourceId: string
  datasource?: DataSource
  
  // 查询模式
  queryMode: 'sql' | 'visual'
  
  // SQL 模式
  sql?: string
  sqlParams?: Array<{
    name: string
    type: 'string' | 'number' | 'date' | 'datetime'
    defaultValue?: string
    required: boolean
  }>
  
  // 可视化模式
  database?: string
  table?: string
  selectedFields?: string[]
  
  // 分区过滤 (ClickHouse 特有)
  partitionField?: string
  partitionStart?: string
  partitionEnd?: string
  
  filters?: FilterCondition[]
  sorts?: SortConfig[]
  limit?: number
  
  // 采样设置 (ClickHouse 特有)
  samplingEnabled: boolean
  samplingRate?: number
  
  // 增量配置
  incrementalEnabled: boolean
  incrementalField?: string
  incrementalMode?: 'timestamp' | 'id' | 'cdc'
  
  // 高级设置
  batchSize: number
  timeout: number
}

// ============================================================================
// Transform 配置类型
// ============================================================================

export interface FilterTransformConfig {
  conditions: FilterCondition[]
  logic: 'and' | 'or'
}

export interface MapTransformConfig {
  mappings: Array<{
    sourceField: string
    targetField: string
    transform?: 'none' | 'uppercase' | 'lowercase' | 'trim' | 'to_int' | 'to_float' | 'to_date' | 'custom'
    customExpr?: string
  }>
  dropUnmapped: boolean
}

export interface JoinTransformConfig {
  joinType: 'inner' | 'left' | 'right' | 'full'
  rightInput?: string // 右表节点ID
  joinConditions: Array<{
    leftField: string
    rightField: string
  }>
  selectFields?: Array<{
    source: 'left' | 'right'
    field: string
    alias?: string
  }>
}

export interface AggregateTransformConfig {
  groupByFields: string[]
  aggregations: Array<{
    field: string
    function: 'sum' | 'avg' | 'count' | 'min' | 'max' | 'count_distinct' | 'first' | 'last'
    alias: string
  }>
}

export interface DedupeTransformConfig {
  dedupeKeys: string[]
  keepStrategy: 'first' | 'last'
  orderByField?: string
  orderByDirection?: 'asc' | 'desc'
}

// ============================================================================
// Load 配置类型
// ============================================================================

// PostgreSQL Target
export interface PostgresTargetConfig {
  // 数据源
  datasourceId: string
  datasource?: DataSource
  
  // 目标表
  schema: string
  table: string
  
  // 写入模式
  writeMode: 'append' | 'overwrite' | 'upsert'
  
  // Upsert 配置
  primaryKeys?: string[]
  updateFields?: string[]
  
  // 字段映射
  fieldMappings?: Array<{
    sourceField: string
    targetField: string
  }>
  
  // 高级设置
  batchSize: number
  preSQL?: string
  postSQL?: string
}

// ClickHouse Target
export interface ClickhouseTargetConfig {
  // 数据源
  datasourceId: string
  datasource?: DataSource
  
  // 目标表
  database: string
  table: string
  
  // 写入设置
  writeMode: 'append' | 'overwrite'
  
  // 分区设置 (ClickHouse 特有)
  partitionBy?: string
  orderBy?: string[]
  
  // 字段映射
  fieldMappings?: Array<{
    sourceField: string
    targetField: string
  }>
  
  // 高级设置
  batchSize: number
}

// CSV Target
export interface CsvTargetConfig {
  // 输出位置
  outputType: 'download' | 'path' | 's3'
  
  // 本地路径
  outputPath?: string
  
  // S3
  s3Bucket?: string
  s3Region?: string
  s3Path?: string
  
  // 输出设置
  encoding: 'utf-8' | 'gbk'
  delimiter: ',' | '\t' | ';' | '|'
  includeHeader: boolean
  
  // 字段选择
  selectedFields?: string[]
}

// ============================================================================
// 节点配置联合类型
// ============================================================================

export type ExtractConfig = CsvSourceConfig | PostgresSourceConfig | ClickhouseSourceConfig
export type TransformConfig = FilterTransformConfig | MapTransformConfig | JoinTransformConfig | AggregateTransformConfig | DedupeTransformConfig
export type LoadConfig = PostgresTargetConfig | ClickhouseTargetConfig | CsvTargetConfig

export type NodeConfig = ExtractConfig | TransformConfig | LoadConfig

// ============================================================================
// 配置组件 Props
// ============================================================================

export interface NodeConfigProps<T = NodeConfig> {
  config: Partial<T>
  onChange: (config: Partial<T>) => void
  nodeId: string
}
