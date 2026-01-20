import { Plus, Trash2 } from 'lucide-react'
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Badge,
} from '@/components/ui'
import type { FilterCondition, FieldInfo } from '../types'

interface FilterBuilderProps {
  conditions: FilterCondition[]
  onChange: (conditions: FilterCondition[]) => void
  fields: FieldInfo[]
  logic?: 'and' | 'or'
  onLogicChange?: (logic: 'and' | 'or') => void
  label?: string
}

const OPERATORS = [
  { value: 'eq', label: '=', description: '等于' },
  { value: 'ne', label: '≠', description: '不等于' },
  { value: 'gt', label: '>', description: '大于' },
  { value: 'gte', label: '≥', description: '大于等于' },
  { value: 'lt', label: '<', description: '小于' },
  { value: 'lte', label: '≤', description: '小于等于' },
  { value: 'like', label: 'LIKE', description: '模糊匹配' },
  { value: 'in', label: 'IN', description: '在列表中' },
  { value: 'between', label: 'BETWEEN', description: '在范围内' },
  { value: 'is_null', label: 'IS NULL', description: '为空' },
  { value: 'not_null', label: 'NOT NULL', description: '不为空' },
] as const

export function FilterBuilder({
  conditions,
  onChange,
  fields,
  logic = 'and',
  onLogicChange,
  label = '过滤条件',
}: FilterBuilderProps) {
  // 添加条件
  const addCondition = () => {
    const newCondition: FilterCondition = {
      id: `cond-${Date.now()}`,
      field: fields[0]?.name || '',
      operator: 'eq',
      value: '',
    }
    onChange([...conditions, newCondition])
  }

  // 更新条件
  const updateCondition = (id: string, updates: Partial<FilterCondition>) => {
    onChange(conditions.map(c => c.id === id ? { ...c, ...updates } : c))
  }

  // 删除条件
  const removeCondition = (id: string) => {
    onChange(conditions.filter(c => c.id !== id))
  }

  // 根据字段类型推荐操作符
  const getFieldType = (fieldName: string): string => {
    const field = fields.find(f => f.name === fieldName)
    return field?.type.toLowerCase() || 'string'
  }

  // 获取值输入的占位符
  const getValuePlaceholder = (operator: FilterCondition['operator'], fieldType: string): string => {
    if (operator === 'in') return '值1, 值2, 值3'
    if (operator === 'like') return '%关键字%'
    if (operator === 'between') return '起始值'
    if (fieldType.includes('date')) return 'YYYY-MM-DD'
    if (fieldType.includes('int') || fieldType.includes('numeric')) return '数值'
    return '值'
  }

  // 是否需要值输入
  const needsValue = (operator: FilterCondition['operator']): boolean => {
    return !['is_null', 'not_null'].includes(operator)
  }

  // 是否需要第二个值
  const needsSecondValue = (operator: FilterCondition['operator']): boolean => {
    return operator === 'between'
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{label}</Label>
        <div className="flex items-center gap-2">
          {conditions.length > 1 && onLogicChange && (
            <Select value={logic} onValueChange={(v) => onLogicChange(v as 'and' | 'or')}>
              <SelectTrigger className="w-20 h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="and">AND</SelectItem>
                <SelectItem value="or">OR</SelectItem>
              </SelectContent>
            </Select>
          )}
          <Button variant="outline" size="sm" onClick={addCondition}>
            <Plus className="w-3 h-3 mr-1" />
            添加
          </Button>
        </div>
      </div>

      {conditions.length === 0 ? (
        <div className="border border-dashed rounded-lg p-6 text-center text-muted-foreground">
          <p className="text-sm">暂无过滤条件</p>
          <p className="text-xs mt-1">点击"添加"创建条件</p>
        </div>
      ) : (
        <div className="space-y-2">
          {conditions.map((condition, index) => {
            const fieldType = getFieldType(condition.field)
            
            return (
              <div
                key={condition.id}
                className="flex items-center gap-2 p-3 border rounded-lg bg-muted/30 group"
              >
                {/* 逻辑连接符 */}
                {index > 0 && (
                  <Badge variant="outline" className="flex-shrink-0 text-xs">
                    {logic.toUpperCase()}
                  </Badge>
                )}
                
                {/* 字段选择 */}
                <Select
                  value={condition.field}
                  onValueChange={(v) => updateCondition(condition.id, { field: v })}
                >
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="字段" />
                  </SelectTrigger>
                  <SelectContent>
                    {fields.map(f => (
                      <SelectItem key={f.name} value={f.name}>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm">{f.name}</span>
                          <span className="text-xs text-muted-foreground">{f.type}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* 操作符选择 */}
                <Select
                  value={condition.operator}
                  onValueChange={(v) => updateCondition(condition.id, { operator: v as FilterCondition['operator'] })}
                >
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OPERATORS.map(op => (
                      <SelectItem key={op.value} value={op.value}>
                        <div className="flex items-center gap-2">
                          <span className="font-mono">{op.label}</span>
                          <span className="text-xs text-muted-foreground">{op.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* 值输入 */}
                {needsValue(condition.operator) && (
                  <Input
                    value={condition.value}
                    onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
                    placeholder={getValuePlaceholder(condition.operator, fieldType)}
                    className="flex-1 min-w-24"
                  />
                )}

                {/* 第二个值（BETWEEN） */}
                {needsSecondValue(condition.operator) && (
                  <>
                    <span className="text-muted-foreground text-sm">至</span>
                    <Input
                      value={condition.value2 || ''}
                      onChange={(e) => updateCondition(condition.id, { value2: e.target.value })}
                      placeholder="结束值"
                      className="flex-1 min-w-24"
                    />
                  </>
                )}

                {/* 删除按钮 */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => removeCondition(condition.id)}
                >
                  <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                </Button>
              </div>
            )
          })}
        </div>
      )}

      {/* 预览生成的 WHERE 子句 */}
      {conditions.length > 0 && (
        <div className="p-2 bg-muted rounded text-xs font-mono text-muted-foreground">
          WHERE{' '}
          {conditions.map((c, i) => {
            const parts = []
            if (i > 0) parts.push(` ${logic.toUpperCase()} `)
            
            const op = OPERATORS.find(o => o.value === c.operator)
            switch (c.operator) {
              case 'is_null':
                parts.push(`${c.field} IS NULL`)
                break
              case 'not_null':
                parts.push(`${c.field} IS NOT NULL`)
                break
              case 'between':
                parts.push(`${c.field} BETWEEN '${c.value}' AND '${c.value2 || ''}'`)
                break
              case 'in':
                parts.push(`${c.field} IN (${c.value.split(',').map(v => `'${v.trim()}'`).join(', ')})`)
                break
              case 'like':
                parts.push(`${c.field} LIKE '${c.value}'`)
                break
              default:
                parts.push(`${c.field} ${op?.label || '='} '${c.value}'`)
            }
            return parts.join('')
          }).join('')}
        </div>
      )}
    </div>
  )
}
