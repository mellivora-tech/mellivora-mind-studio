import { Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui'
import type { NodeConfigProps, JoinTransformConfig as JoinTransformConfigType } from '../types'

export function JoinTransformConfig({ config, onChange }: NodeConfigProps<JoinTransformConfigType>) {
  const current: JoinTransformConfigType = {
    joinType: 'inner',
    joinConditions: [{ leftField: '', rightField: '' }],
    selectFields: [],
    ...config,
  }

  const update = (updates: Partial<JoinTransformConfigType>) => onChange({ ...current, ...updates })

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-sm">Join 类型</Label>
        <Select
          value={current.joinType}
          onValueChange={(v) => update({ joinType: v as JoinTransformConfigType['joinType'] })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="inner">Inner Join</SelectItem>
            <SelectItem value="left">Left Join</SelectItem>
            <SelectItem value="right">Right Join</SelectItem>
            <SelectItem value="full">Full Join</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-sm">关联条件</Label>
        {current.joinConditions.map((cond, idx) => (
          <div key={idx} className="grid grid-cols-2 gap-2">
            <Input
              value={cond.leftField}
              onChange={(e) => {
                const newConds = [...current.joinConditions]
                newConds[idx] = { ...cond, leftField: e.target.value }
                update({ joinConditions: newConds })
              }}
              placeholder="左侧字段"
              className="font-mono"
            />
            <Input
              value={cond.rightField}
              onChange={(e) => {
                const newConds = [...current.joinConditions]
                newConds[idx] = { ...cond, rightField: e.target.value }
                update({ joinConditions: newConds })
              }}
              placeholder="右侧字段"
              className="font-mono"
            />
          </div>
        ))}
      </div>
    </div>
  )
}
