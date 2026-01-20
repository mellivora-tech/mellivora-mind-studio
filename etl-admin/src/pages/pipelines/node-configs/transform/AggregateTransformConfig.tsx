import { Input, Label, Textarea, Badge } from '@/components/ui'
import type { NodeConfigProps, AggregateTransformConfig as AggregateTransformConfigType } from '../types'

export function AggregateTransformConfig({ config, onChange }: NodeConfigProps<AggregateTransformConfigType>) {
  const current: AggregateTransformConfigType = {
    groupByFields: [],
    aggregations: [],
    ...config,
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-sm">分组字段 (逗号分隔)</Label>
        <Input
          value={current.groupByFields.join(',')}
          onChange={(e) => onChange({ ...current, groupByFields: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
          placeholder="category, date"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-sm">聚合函数 (一行一个)</Label>
        <Textarea
          rows={4}
          className="font-mono text-sm"
          placeholder={'SUM(amount) as total\nCOUNT(*) as cnt\nAVG(price) as avg_price'}
          value={current.aggregations.map(a => `${a.function.toUpperCase()}(${a.field}) as ${a.alias}`).join('\n')}
          onChange={(e) => {
            const allowed = ['sum', 'avg', 'count', 'min', 'max', 'count_distinct', 'first', 'last'] as const
            type AggFn = typeof allowed[number]
            const toFn = (fn: string): AggFn => (allowed as readonly string[]).includes(fn) ? (fn as AggFn) : 'sum'

            const lines = e.target.value.split('\n').filter(Boolean)
            const aggs = lines.map(line => {
              const match = line.match(/(\w+)\((.+)\)\s+as\s+(\w+)/i)
              if (match) {
                const safeFn = toFn(match[1].toLowerCase())
                return {
                  function: safeFn,
                  field: match[2].trim(),
                  alias: match[3].trim(),
                }
              }
              return { function: 'sum' as AggFn, field: line.trim(), alias: line.trim() }
            })
            onChange({ ...current, aggregations: aggs })
          }}
        />
      </div>

      <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg space-y-1">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">提示</Badge>
          <span>支持函数: sum, avg, count, min, max, count_distinct, first, last</span>
        </div>
      </div>
    </div>
  )
}
