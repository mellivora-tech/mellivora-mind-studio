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
import type { NodeConfigProps, PostgresSourceConfig as PostgresSourceConfigType, FieldInfo } from '../types'

// Mock fields - in production these would come from metadata API
const MOCK_FIELDS: FieldInfo[] = [
  { name: 'id', type: 'bigint', nullable: false },
  { name: 'created_at', type: 'timestamp', nullable: false },
  { name: 'updated_at', type: 'timestamp', nullable: true },
]

export function PostgresSourceConfig({ config, onChange }: NodeConfigProps<PostgresSourceConfigType>) {
  const current: PostgresSourceConfigType = {
    datasourceId: '',
    queryMode: 'sql',
    sql: 'SELECT * FROM public.table_name WHERE updated_at >= ${start_date}',
    sqlParams: [],
    schema: 'public',
    table: 'table_name',
    selectedFields: [],
    filters: [],
    sorts: [],
    limit: 1000,
    incrementalEnabled: false,
    batchSize: 5000,
    concurrency: 1,
    timeout: 300,
    ...config,
  }

  const update = (updates: Partial<PostgresSourceConfigType>) => {
    onChange({ ...current, ...updates })
  }

  const fields = MOCK_FIELDS

  return (
    <div className="space-y-4">
      {/* Datasource Selection */}
      <DatasourceSelect
        value={current.datasourceId}
        onChange={(id, ds) => update({ datasourceId: id, datasource: ds })}
        label="数据源 (PostgreSQL)"
        placeholder="选择 PostgreSQL 数据源"
        pluginFilter={['source-postgres']}
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
            placeholder="SELECT * FROM public.table WHERE ..."
          />
        </TabsContent>

        <TabsContent value="visual" className="mt-3 space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm">Schema</Label>
              <Input
                value={current.schema}
                onChange={(e) => update({ schema: e.target.value })}
                placeholder="public"
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
                placeholder="updated_at"
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
              placeholder="updated_at"
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
      <div className="grid grid-cols-3 gap-4 pt-4 border-t">
        <div className="space-y-2">
          <Label className="text-sm">批量大小</Label>
          <Input
            type="number"
            value={current.batchSize}
            onChange={(e) => update({ batchSize: parseInt(e.target.value) || 5000 })}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm">并发</Label>
          <Input
            type="number"
            value={current.concurrency}
            onChange={(e) => update({ concurrency: parseInt(e.target.value) || 1 })}
            min={1}
            max={10}
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
            <li>SQL 模式支持 ${'{param}'} 参数占位符</li>
            <li>可视化模式可直接输入字段名，后续可接入元数据自动补全</li>
            <li>增量采集请设置增量字段与模式</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
