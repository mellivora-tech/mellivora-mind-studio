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
import type { NodeConfigProps, PostgresTargetConfig as PostgresTargetConfigType, FieldInfo } from '../types'

const DEFAULT_FIELDS: FieldInfo[] = [
  { name: 'id', type: 'bigint', nullable: false },
  { name: 'name', type: 'varchar', nullable: true },
  { name: 'value', type: 'numeric', nullable: true },
  { name: 'created_at', type: 'timestamp', nullable: false },
]

export function PostgresTargetConfig({ config, onChange }: NodeConfigProps<PostgresTargetConfigType>) {
  const current: PostgresTargetConfigType = {
    datasourceId: '',
    schema: 'public',
    table: '',
    writeMode: 'append',
    primaryKeys: [],
    fieldMappings: [],
    batchSize: 1000,
    ...config,
  }

  const update = (updates: Partial<PostgresTargetConfigType>) => {
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
        label="目标数据源 (PostgreSQL)"
        placeholder="选择 PostgreSQL 数据源"
        pluginFilter={['target-postgres', 'source-postgres']}
      />

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
          <Label className="text-sm">表名</Label>
          <Input
            value={current.table}
            onChange={(e) => update({ table: e.target.value })}
            placeholder="target_table"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-sm">写入模式</Label>
          <Select
            value={current.writeMode}
            onValueChange={(v) => update({ writeMode: v as PostgresTargetConfigType['writeMode'] })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="append">追加 (Append)</SelectItem>
              <SelectItem value="overwrite">覆盖 (Overwrite)</SelectItem>
              <SelectItem value="upsert">更新插入 (Upsert)</SelectItem>
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

      {current.writeMode === 'upsert' && (
        <div className="space-y-4 pl-4 border-l-2 border-slate-200">
          <div className="space-y-2">
            <Label className="text-sm">主键字段 (逗号分隔)</Label>
            <Input
              value={current.primaryKeys?.join(', ') || ''}
              onChange={(e) => update({ 
                primaryKeys: e.target.value.split(',').map(s => s.trim()).filter(Boolean) 
              })}
              placeholder="id"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm">更新字段 (逗号分隔，留空更新全部)</Label>
            <Input
              value={current.updateFields?.join(', ') || ''}
              onChange={(e) => update({ 
                updateFields: e.target.value.split(',').map(s => s.trim()).filter(Boolean) 
              })}
              placeholder="name, value, updated_at"
            />
          </div>
        </div>
      )}

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

      <div className="space-y-4 pt-4 border-t">
        <div className="space-y-2">
          <Label className="text-sm">执行前 SQL (可选)</Label>
          <Input
            value={current.preSQL || ''}
            onChange={(e) => update({ preSQL: e.target.value })}
            placeholder="TRUNCATE TABLE ..."
            className="font-mono"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm">执行后 SQL (可选)</Label>
          <Input
            value={current.postSQL || ''}
            onChange={(e) => update({ postSQL: e.target.value })}
            placeholder="REFRESH MATERIALIZED VIEW ..."
            className="font-mono"
          />
        </div>
      </div>

      <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
        <Database className="w-4 h-4 mt-0.5" />
        <div className="space-y-1">
          <div>建议：</div>
          <div className="flex flex-col gap-1">
            <span>· Upsert 模式需要指定主键字段</span>
            <span>· 使用 Pre/Post SQL 可执行额外的维护操作</span>
          </div>
        </div>
      </div>
    </div>
  )
}
