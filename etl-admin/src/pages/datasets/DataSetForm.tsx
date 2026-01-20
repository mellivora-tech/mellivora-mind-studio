import { useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod/v4'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Loader2, Plus, Trash2, GripVertical, ChevronDown, ChevronUp } from 'lucide-react'
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  Switch,
  Card,
  CardContent,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui'
import { datasetsApi } from '@/api'
import type { DataSet, FieldType, StorageType } from '@/types/etl'

const fieldTypes: { value: FieldType; label: string }[] = [
  { value: 'string', label: '字符串 (String)' },
  { value: 'int', label: '整数 (Int)' },
  { value: 'bigint', label: '长整数 (BigInt)' },
  { value: 'decimal', label: '小数 (Decimal)' },
  { value: 'float', label: '浮点 (Float)' },
  { value: 'double', label: '双精度 (Double)' },
  { value: 'bool', label: '布尔 (Bool)' },
  { value: 'date', label: '日期 (Date)' },
  { value: 'datetime', label: '日期时间 (DateTime)' },
  { value: 'json', label: 'JSON' },
  { value: 'enum', label: '枚举 (Enum)' },
]

const fieldSchema = z.object({
  name: z.string().min(1, '请输入字段名'),
  type: z.enum(['string', 'int', 'bigint', 'decimal', 'float', 'double', 'bool', 'date', 'datetime', 'json', 'enum']),
  precision: z.number().optional(),
  scale: z.number().optional(),
  enumValues: z.array(z.string()).optional(),
  primary: z.boolean().optional(),
  nullable: z.boolean().optional(),
  default: z.unknown().optional(),
  description: z.string().optional(),
})

const formSchema = z.object({
  name: z.string().min(1, '请输入名称').regex(/^[a-z_][a-z0-9_]*$/, '只能包含小写字母、数字和下划线'),
  category: z.string().min(1, '请选择分类'),
  description: z.string().optional(),
  schema: z.object({
    fields: z.array(fieldSchema).min(1, '至少需要一个字段'),
  }),
  storage: z.object({
    type: z.enum(['postgres', 'clickhouse', 'redis']),
    table: z.string().min(1, '请输入表名'),
    partitionBy: z.string().optional(),
    orderBy: z.array(z.string()).optional(),
    ttlDays: z.number().optional(),
  }),
  labels: z.record(z.string(), z.string()).optional(),
})

type FormData = z.output<typeof formSchema>

interface DataSetFormProps {
  initialData?: DataSet | null
  onSuccess: () => void
  onCancel: () => void
}

export function DataSetForm({ initialData, onSuccess, onCancel }: DataSetFormProps) {
  const [expandedField, setExpandedField] = useState<number | null>(null)

  const { data: categories } = useQuery({
    queryKey: ['dataset-categories'],
    queryFn: () => datasetsApi.getCategories(),
  })

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: initialData ? {
      name: initialData.name,
      category: initialData.category,
      description: initialData.description || '',
      schema: initialData.schema,
      storage: initialData.storage,
      labels: initialData.labels,
    } : {
      name: '',
      category: '',
      description: '',
      schema: { fields: [{ name: '', type: 'string' as const, primary: false, nullable: true }] },
      storage: { type: 'clickhouse' as const, table: '', orderBy: [] as string[] },
      labels: {},
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'schema.fields',
  })

  const createMutation = useMutation({
    mutationFn: (data: FormData) => datasetsApi.create(data as unknown as Partial<DataSet>),
    onSuccess,
  })

  const updateMutation = useMutation({
    mutationFn: (data: FormData) => datasetsApi.update(initialData!.id, data as unknown as Partial<DataSet>),
    onSuccess,
  })

  const onSubmit = (data: unknown) => {
    const formData = data as FormData
    // 自动设置表名
    if (!formData.storage.table) {
      formData.storage.table = formData.name
    }
    
    if (initialData) {
      updateMutation.mutate(formData)
    } else {
      createMutation.mutate(formData)
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  const addField = () => {
    append({ name: '', type: 'string', primary: false, nullable: true })
    setExpandedField(fields.length)
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <Tabs defaultValue="basic">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="basic">基本信息</TabsTrigger>
          <TabsTrigger value="schema">字段定义</TabsTrigger>
          <TabsTrigger value="storage">存储配置</TabsTrigger>
        </TabsList>

        {/* 基本信息 */}
        <TabsContent value="basic" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">名称 *</Label>
              <Input
                id="name"
                {...form.register('name')}
                placeholder="stock_daily"
                disabled={!!initialData}
              />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">分类 *</Label>
              <Select
                value={form.watch('category')}
                onValueChange={(value) => form.setValue('category', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择分类" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                  <SelectItem value="market-data">行情数据</SelectItem>
                  <SelectItem value="factor-data">因子数据</SelectItem>
                  <SelectItem value="reference-data">基础数据</SelectItem>
                  <SelectItem value="trading-data">交易数据</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">描述</Label>
            <Textarea
              id="description"
              {...form.register('description')}
              placeholder="描述数据集的用途..."
              rows={3}
            />
          </div>
        </TabsContent>

        {/* 字段定义 */}
        <TabsContent value="schema" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <Label>字段列表</Label>
            <Button type="button" variant="outline" size="sm" onClick={addField}>
              <Plus className="h-4 w-4 mr-1" />
              添加字段
            </Button>
          </div>

          <div className="space-y-2">
            {fields.map((field, index) => (
              <Card key={field.id} className="overflow-hidden">
                <div
                  className="flex items-center justify-between p-3 bg-muted/50 cursor-pointer"
                  onClick={() => setExpandedField(expandedField === index ? null : index)}
                >
                  <div className="flex items-center space-x-3">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <span className="font-mono text-sm">
                      {form.watch(`schema.fields.${index}.name`) || '(未命名)'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {form.watch(`schema.fields.${index}.type`)}
                    </span>
                    {form.watch(`schema.fields.${index}.primary`) && (
                      <span className="text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded">主键</span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation()
                        remove(index)
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    {expandedField === index ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </div>

                {expandedField === index && (
                  <CardContent className="p-4 space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>字段名 *</Label>
                        <Input
                          {...form.register(`schema.fields.${index}.name`)}
                          placeholder="field_name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>类型 *</Label>
                        <Select
                          value={form.watch(`schema.fields.${index}.type`)}
                          onValueChange={(value) => 
                            form.setValue(`schema.fields.${index}.type`, value as FieldType)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {fieldTypes.map((t) => (
                              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {form.watch(`schema.fields.${index}.type`) === 'decimal' && (
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-2">
                            <Label>精度</Label>
                            <Input
                              type="number"
                              {...form.register(`schema.fields.${index}.precision`, { valueAsNumber: true })}
                              placeholder="20"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>小数位</Label>
                            <Input
                              type="number"
                              {...form.register(`schema.fields.${index}.scale`, { valueAsNumber: true })}
                              placeholder="4"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-6">
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={form.watch(`schema.fields.${index}.primary`)}
                          onCheckedChange={(checked) => 
                            form.setValue(`schema.fields.${index}.primary`, checked)
                          }
                        />
                        <Label>主键</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={form.watch(`schema.fields.${index}.nullable`)}
                          onCheckedChange={(checked) => 
                            form.setValue(`schema.fields.${index}.nullable`, checked)
                          }
                        />
                        <Label>可空</Label>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>描述</Label>
                      <Input
                        {...form.register(`schema.fields.${index}.description`)}
                        placeholder="字段描述..."
                      />
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>

          {fields.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              暂无字段，点击"添加字段"开始定义
            </div>
          )}
        </TabsContent>

        {/* 存储配置 */}
        <TabsContent value="storage" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>存储类型 *</Label>
              <Select
                value={form.watch('storage.type')}
                onValueChange={(value) => form.setValue('storage.type', value as StorageType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="clickhouse">ClickHouse</SelectItem>
                  <SelectItem value="postgres">PostgreSQL</SelectItem>
                  <SelectItem value="redis">Redis</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>表名</Label>
              <Input
                {...form.register('storage.table')}
                placeholder={form.watch('name') || 'table_name'}
              />
            </div>
          </div>

          {form.watch('storage.type') === 'clickhouse' && (
            <>
              <div className="space-y-2">
                <Label>分区表达式</Label>
                <Input
                  {...form.register('storage.partitionBy')}
                  placeholder="toYYYYMM(date)"
                />
                <p className="text-xs text-muted-foreground">
                  ClickHouse 分区键，如 toYYYYMM(date)
                </p>
              </div>

              <div className="space-y-2">
                <Label>排序键</Label>
                <Input
                  value={form.watch('storage.orderBy')?.join(', ') || ''}
                  onChange={(e) => {
                    const values = e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                    form.setValue('storage.orderBy', values)
                  }}
                  placeholder="code, exchange, date"
                />
                <p className="text-xs text-muted-foreground">
                  多个字段用逗号分隔
                </p>
              </div>

              <div className="space-y-2">
                <Label>TTL (天)</Label>
                <Input
                  type="number"
                  {...form.register('storage.ttlDays', { valueAsNumber: true })}
                  placeholder="3650"
                />
                <p className="text-xs text-muted-foreground">
                  数据保留天数，留空表示永久保存
                </p>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* 操作按钮 */}
      <div className="flex justify-end space-x-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          取消
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              保存中...
            </>
          ) : (
            '保存'
          )}
        </Button>
      </div>
    </form>
  )
}
