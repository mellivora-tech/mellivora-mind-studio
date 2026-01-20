import { useState, useMemo } from 'react'
import { Search, Check, GripVertical } from 'lucide-react'
import {
  Input,
  Label,
  Badge,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui'
import type { FieldInfo } from '../types'

interface FieldSelectorProps {
  fields: FieldInfo[]
  selectedFields: string[]
  onChange: (selected: string[]) => void
  label?: string
  maxHeight?: string
  sortable?: boolean
  showTypes?: boolean
  multiSelect?: boolean
}

export function FieldSelector({
  fields,
  selectedFields,
  onChange,
  label = '选择字段',
  maxHeight = '300px',
  sortable = false,
  showTypes = true,
  multiSelect = true,
}: FieldSelectorProps) {
  const [search, setSearch] = useState('')
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  // 过滤字段
  const filteredFields = useMemo(() => {
    if (!search) return fields
    const lowerSearch = search.toLowerCase()
    return fields.filter(f => 
      f.name.toLowerCase().includes(lowerSearch) ||
      f.type.toLowerCase().includes(lowerSearch) ||
      f.comment?.toLowerCase().includes(lowerSearch)
    )
  }, [fields, search])

  // 已选字段排序
  const sortedSelectedFields = useMemo(() => {
    if (!sortable) return selectedFields
    return selectedFields
  }, [selectedFields, sortable])

  // 切换选择
  const toggleField = (fieldName: string) => {
    if (multiSelect) {
      if (selectedFields.includes(fieldName)) {
        onChange(selectedFields.filter(f => f !== fieldName))
      } else {
        onChange([...selectedFields, fieldName])
      }
    } else {
      onChange([fieldName])
    }
  }

  // 全选/取消全选
  const toggleAll = () => {
    if (selectedFields.length === fields.length) {
      onChange([])
    } else {
      onChange(fields.map(f => f.name))
    }
  }

  // 拖拽排序
  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return
    
    const newOrder = [...sortedSelectedFields]
    const [removed] = newOrder.splice(draggedIndex, 1)
    newOrder.splice(index, 0, removed)
    onChange(newOrder)
    setDraggedIndex(index)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

  // 类型颜色
  const getTypeColor = (type: string) => {
    const t = type.toLowerCase()
    if (t.includes('int') || t.includes('numeric') || t.includes('decimal') || t.includes('float') || t.includes('double')) {
      return 'bg-blue-100 text-blue-700'
    }
    if (t.includes('char') || t.includes('text') || t.includes('string')) {
      return 'bg-green-100 text-green-700'
    }
    if (t.includes('date') || t.includes('time')) {
      return 'bg-purple-100 text-purple-700'
    }
    if (t.includes('bool')) {
      return 'bg-yellow-100 text-yellow-700'
    }
    if (t.includes('json') || t.includes('array')) {
      return 'bg-orange-100 text-orange-700'
    }
    return 'bg-slate-100 text-slate-700'
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{label}</Label>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            {selectedFields.length} / {fields.length}
          </Badge>
          {multiSelect && (
            <Button variant="ghost" size="sm" onClick={toggleAll}>
              {selectedFields.length === fields.length ? '取消全选' : '全选'}
            </Button>
          )}
        </div>
      </div>

      {/* 搜索框 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索字段..."
          className="pl-9"
        />
      </div>

      {/* 字段列表 */}
      <div 
        className="border rounded-lg overflow-auto"
        style={{ maxHeight }}
      >
        {filteredFields.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            {search ? '未找到匹配的字段' : '暂无字段'}
          </div>
        ) : (
          <div className="divide-y">
            {filteredFields.map((field, index) => {
              const isSelected = selectedFields.includes(field.name)
              return (
                <div
                  key={field.name}
                  className={`flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors ${
                    isSelected ? 'bg-primary/5' : ''
                  }`}
                  onClick={() => toggleField(field.name)}
                  draggable={sortable && isSelected}
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                >
                  {sortable && isSelected && (
                    <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                  )}
                  
                  <div className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 ${
                    isSelected 
                      ? 'bg-primary border-primary text-primary-foreground' 
                      : 'border-input'
                  }`}>
                    {isSelected && <Check className="w-3 h-3" />}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm truncate">{field.name}</span>
                      {field.nullable === false && (
                        <span className="text-red-500 text-xs">*</span>
                      )}
                    </div>
                    {field.comment && (
                      <div className="text-xs text-muted-foreground truncate">
                        {field.comment}
                      </div>
                    )}
                  </div>
                  
                  {showTypes && (
                    <Badge variant="secondary" className={`text-xs ${getTypeColor(field.type)}`}>
                      {field.type}
                    </Badge>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 已选字段顺序（可排序时显示） */}
      {sortable && sortedSelectedFields.length > 0 && (
        <div className="text-xs text-muted-foreground">
          输出顺序: {sortedSelectedFields.join(' → ')}
        </div>
      )}
    </div>
  )
}

// 单字段选择器（下拉框形式）
interface SingleFieldSelectProps {
  fields: FieldInfo[]
  value?: string
  onChange: (field: string) => void
  label?: string
  placeholder?: string
}

export function SingleFieldSelect({
  fields,
  value,
  onChange,
  label,
  placeholder = '选择字段...',
}: SingleFieldSelectProps) {
  return (
    <div className="space-y-2">
      {label && <Label className="text-sm font-medium">{label}</Label>}
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {fields.map((field) => (
            <SelectItem key={field.name} value={field.name}>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm flex-1">{field.name}</span>
                <Badge variant="secondary" className="text-xs">{field.type}</Badge>
                {value === field.name && <Check className="w-4 h-4 text-primary" />}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
