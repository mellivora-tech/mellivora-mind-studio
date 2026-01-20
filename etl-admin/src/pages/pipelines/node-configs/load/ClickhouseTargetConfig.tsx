import { Database } from 'lucide-react'
import {
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui'
import { DatasourceSelect, FieldSelector } from '../shared'
import type { NodeConfigProps, ClickhouseTargetConfig as ClickhouseTargetConfigType, FieldInfo } from '../types'

const DEFAULT_FIELDS: FieldInfo[] = [
  { name: 'id', type: 'UInt64', nullable: false },
  { name: 'event_time', type: 'DateTime', nullable: false },
  { name: 'value', type: 'Float64', nullable: true },
]

export function ClickhouseTargetConfig({ config, onChange }: NodeConfigProps<ClickhouseTargetConfigType>) {
  const current: ClickhouseTargetConfigType = {
    datasourceId: '',
    database: 'default',
    table: '',
    writeMode: 'append',
    partitionBy: '',
    orderBy: [],
    fieldMappings: [],
    batchSize: 10000,
    ...config,
  }

  const update = (updates: Partial<ClickhouseTargetConfigType>) => {
    onChange({ ...current, ...updates })
  }

  const fields: FieldInfo[] = current.fieldMappings?.length
    ? current.fieldMappings.map((m) => ({ name: m.sourceField, type: 'String' }))
    : DEFAULT_FIELDS

  return (
    <div className="space-y-6">
      <DatasourceSelect
        value={current.datasourceId}
        onChange={(id, ds) => update({ datasourceId: id, datasource: ds })}
        label="目标数据源 (ClickHouse)"
        placeholder="选择 ClickHouse 数据源"
        pluginFilter={['target-clickhouse', 'source-clickhouse']}
      />

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
          <Label className="text-sm">表名</Label>
          <Input
            value={current.table}
            onChange={(e) => update({ table: e.target.value })}
            placeholder="target_table"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label className="text-sm">写入模式</Label>
          <Select
            value={current.writeMode}
            onValueChange={(v) => update({ writeMode: v as ClickhouseTargetConfigType['writeMode'] })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="append">追加 (Append)</SelectItem>
              <SelectItem value="overwrite">覆盖 (Overwrite)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-sm">批量大小</Label>
          <Input
            type="number"
            value={current.batchSize}
            onChange={(e) => update({ batchSize: parseInt(e.target.value) || 1000 })}
            min={1}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-sm">分区键 (可选)</Label>
          <Input
            value={current.partitionBy || ''}
            onChange={(e) => update({ partitionBy: e.target.value })}
            placeholder="toYYYYMM(event_time)"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm">排序键 (可选)</Label>
          <Input
            value={current.orderBy?.join(',') || ''}
            onChange={(e) => update({ orderBy: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
            placeholder="event_time, id"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-sm">字段映射 (可选)</Label>
        <FieldSelector
          fields={fields}
          selectedFields={current.fieldMappings?.map((m) => m.sourceField) || []}
          onChange={(selected) => {
            const mappings = selected.map((name) => ({ sourceField: name, targetField: name }))
            update({ fieldMappings: mappings })
          }}
          label="选择输出字段"
        />
      </div>

      <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
        <Database className="w-4 h-4 mt-0.5" />
        <div className="space-y-1">
          <div>建议：</div>
          <div className="flex flex-col gap-1">
            <span>· ClickHouse 写入建议指定分区键以提升查询性能</span>
            <span>· 批量大小可根据表引擎调整（默认 10k）</span>
          </div>
        </div>
      </div>
    </div>
  )
}
