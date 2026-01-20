import { Info } from 'lucide-react'
import {
  Input,
  Label,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Switch,
} from '@/components/ui'
import { DatasourceSelect, SqlEditor, FieldSelector, FilterBuilder } from '../shared'
import type { NodeConfigProps, ClickhouseSourceConfig as ClickhouseSourceConfigType, FieldInfo } from '../types'

// Mock fields - in production these would come from metadata API
const MOCK_FIELDS: FieldInfo[] = [
  { name: 'id', type: 'UInt64', nullable: false },
  { name: 'event_time', type: 'DateTime', nullable: false },
  { name: 'value', type: 'Float64', nullable: true },
]

export function ClickhouseSourceConfig({ config, onChange }: NodeConfigProps<ClickhouseSourceConfigType>) {
  const current: ClickhouseSourceConfigType = {
    datasourceId: '',
    queryMode: 'sql',
    sql: 'SELECT * FROM database.table_name WHERE event_time >= ${start_date}',
    sqlParams: [],
    database: 'default',
    table: 'table_name',
    selectedFields: [],
    filters: [],
    sorts: [],
    limit: 1000,
    samplingEnabled: false,
    incrementalEnabled: false,
    batchSize: 10000,
    timeout: 300,
    ...config,
  }

  const update = (updates: Partial<ClickhouseSourceConfigType>) => {
    onChange({ ...current, ...updates })
  }

  const fields = MOCK_FIELDS

  return (
    <div className="space-y-4">
      {/* Datasource Selection */}
      <DatasourceSelect
        value={current.datasourceId}
        onChange={(id, ds) => update({ datasourceId: id, datasource: ds })}
        label="数据源 (ClickHouse)"
        placeholder="选择 ClickHouse 数据源"
        pluginFilter={['source-clickhouse']}
      />

      {/* Query Mode Tabs */}
      <Tabs
        value={current.queryMode}
        onValueChange={(v) => update({ queryMode: v as 'sql' | 'visual' })}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="sql">SQL 查询</TabsTrigger>
          <TabsTrigger value="visual">可视化选择</TabsTrigger>
        </TabsList>

        <TabsContent value="sql" className="mt-3 space-y-3">
          <SqlEditor
            value={current.sql || ''}
            onChange={(sql) => update({ sql })}
            params={current.sqlParams}
            onParamsChange={(params) => update({ sqlParams: params })}
            placeholder="SELECT * FROM database.table WHERE ..."
          />
        </TabsContent>

        <TabsContent value="visual" className="mt-3 space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm">数据库</Label>
              <Input
                value={current.database}
                onChange={(e) => update({ database: e.target.value })}
                placeholder="default"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">表</Label>
              <Input
                value={current.table}
                onChange={(e) => update({ table: e.target.value })}
                placeholder="table_name"
              />
            </div>
          </div>

          {/* Partition Filter (ClickHouse specific) */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">分区过滤</Label>
            <div className="grid grid-cols-3 gap-2">
              <Input
                value={current.partitionField || ''}
                onChange={(e) => update({ partitionField: e.target.value })}
                placeholder="分区字段"
              />
              <Input
                value={current.partitionStart || ''}
                onChange={(e) => update({ partitionStart: e.target.value })}
                placeholder="开始值"
              />
              <Input
                value={current.partitionEnd || ''}
                onChange={(e) => update({ partitionEnd: e.target.value })}
                placeholder="结束值"
              />
            </div>
          </div>

          <FieldSelector
            fields={fields}
            selectedFields={current.selectedFields || []}
            onChange={(selected) => update({ selectedFields: selected })}
            label="选择字段"
          />

          <FilterBuilder
            fields={fields}
            conditions={current.filters || []}
            onChange={(filters) => update({ filters })}
          />

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-sm">排序字段</Label>
              <Input
                value={current.sorts?.[0]?.field || ''}
                onChange={(e) => update({ sorts: e.target.value ? [{ field: e.target.value, direction: 'asc' }] : [] })}
                placeholder="event_time"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">排序方向</Label>
              <select
                value={current.sorts?.[0]?.direction || 'asc'}
                onChange={(e) => {
                  const field = current.sorts?.[0]?.field || ''
                  if (field) {
                    update({ sorts: [{ field, direction: e.target.value as 'asc' | 'desc' }] })
                  }
                }}
                className="h-10 w-full border rounded-md px-3"
              >
                <option value="asc">升序</option>
                <option value="desc">降序</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">行数限制</Label>
              <Input
                type="number"
                value={current.limit || ''}
                onChange={(e) => update({ limit: parseInt(e.target.value) || undefined })}
                placeholder="1000"
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Sampling (ClickHouse specific) */}
      <div className="flex items-center justify-between py-2 border-t">
        <Label className="text-sm">数据采样</Label>
        <div className="flex items-center gap-2">
          <Switch
            checked={current.samplingEnabled}
            onCheckedChange={(checked) => update({ samplingEnabled: checked })}
          />
          {current.samplingEnabled && (
            <Input
              type="number"
              value={current.samplingRate || 0.1}
              onChange={(e) => update({ samplingRate: parseFloat(e.target.value) || 0.1 })}
              className="h-8 w-20"
              min={0.01}
              max={1}
              step={0.01}
            />
          )}
        </div>
      </div>

      {/* Incremental Settings */}
      <div className="flex items-center justify-between py-2 border-t">
        <Label className="text-sm">增量采集</Label>
        <Switch
          checked={current.incrementalEnabled}
          onCheckedChange={(checked) => update({ incrementalEnabled: checked })}
        />
      </div>

      {current.incrementalEnabled && (
        <div className="grid grid-cols-2 gap-4 pl-4 border-l-2 border-slate-200">
          <div className="space-y-2">
            <Label className="text-sm">增量字段</Label>
            <Input
              value={current.incrementalField || ''}
              onChange={(e) => update({ incrementalField: e.target.value })}
              placeholder="event_time"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm">模式</Label>
            <select
              value={current.incrementalMode || 'timestamp'}
              onChange={(e) => update({ incrementalMode: e.target.value as 'timestamp' | 'id' | 'cdc' })}
              className="h-10 w-full border rounded-md px-3"
            >
              <option value="timestamp">时间戳</option>
              <option value="id">自增ID</option>
              <option value="cdc">CDC</option>
            </select>
          </div>
        </div>
      )}

      {/* Advanced Settings */}
      <div className="grid grid-cols-2 gap-4 pt-4 border-t">
        <div className="space-y-2">
          <Label className="text-sm">批量大小</Label>
          <Input
            type="number"
            value={current.batchSize}
            onChange={(e) => update({ batchSize: parseInt(e.target.value) || 10000 })}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm">超时 (秒)</Label>
          <Input
            type="number"
            value={current.timeout}
            onChange={(e) => update({ timeout: parseInt(e.target.value) || 300 })}
          />
        </div>
      </div>

      {/* Tips */}
      <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
        <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <div className="space-y-1">
          <div className="font-medium">提示：</div>
          <ul className="list-disc list-inside space-y-0.5">
            <li>建议使用分区过滤来提升查询性能</li>
            <li>采样功能可用于测试和调试</li>
            <li>ClickHouse 默认批量大小较大 (10000)</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
