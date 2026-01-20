import { Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui'
import type { NodeConfigProps, DedupeTransformConfig as DedupeTransformConfigType } from '../types'

export function DedupeTransformConfig({ config, onChange }: NodeConfigProps<DedupeTransformConfigType>) {
  const current: DedupeTransformConfigType = {
    dedupeKeys: [],
    keepStrategy: 'first',
    orderByField: '',
    orderByDirection: 'desc',
    ...config,
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-sm">去重键 (逗号分隔)</Label>
        <Input
          value={current.dedupeKeys.join(',')}
          onChange={(e) => onChange({ ...current, dedupeKeys: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
          placeholder="id, code"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-sm">保留策略</Label>
          <Select
            value={current.keepStrategy}
            onValueChange={(v) => onChange({ ...current, keepStrategy: v as DedupeTransformConfigType['keepStrategy'] })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="first">保留第一条</SelectItem>
              <SelectItem value="last">保留最后一条</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-sm">排序字段 (可选)</Label>
          <Input
            value={current.orderByField || ''}
            onChange={(e) => onChange({ ...current, orderByField: e.target.value })}
            placeholder="event_time"
          />
        </div>
      </div>

      {current.orderByField && (
        <div className="space-y-2">
          <Label className="text-sm">排序方向</Label>
          <Select
            value={current.orderByDirection || 'desc'}
            onValueChange={(v) => onChange({ ...current, orderByDirection: v as 'asc' | 'desc' })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="asc">升序</SelectItem>
              <SelectItem value="desc">降序</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  )
}
