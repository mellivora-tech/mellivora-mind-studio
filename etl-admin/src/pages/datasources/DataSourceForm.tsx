import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod/v4'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
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
} from '@/components/ui'
import { datasourcesApi } from '@/api'
import type { DataSource, DataSourceType, Plugin } from '@/types/etl'

const formSchema = z.object({
  name: z.string().min(1, '请输入名称').max(100),
  type: z.enum(['api', 'database', 'file', 'message_queue']),
  plugin: z.string().min(1, '请选择插件'),
  description: z.string().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  capabilities: z.array(z.string()).optional(),
})

type FormData = z.output<typeof formSchema>

interface DataSourceFormProps {
  initialData?: DataSource | null
  onSuccess: () => void
  onCancel: () => void
}

export function DataSourceForm({ initialData, onSuccess, onCancel }: DataSourceFormProps) {
  const [selectedPlugin, setSelectedPlugin] = useState<Plugin | null>(null)

  const { data: plugins, isLoading: loadingPlugins } = useQuery({
    queryKey: ['plugins', 'extract'],
    queryFn: () => datasourcesApi.getPlugins(),
  })

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: initialData ? {
      name: initialData.name,
      type: initialData.type,
      plugin: initialData.plugin,
      description: initialData.description || '',
      config: initialData.config,
      capabilities: initialData.capabilities,
    } : {
      name: '',
      type: 'api' as const,
      plugin: '',
      description: '',
      config: {},
      capabilities: [] as string[],
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: FormData) => datasourcesApi.create({
      ...data,
      config: data.config || {},
      capabilities: data.capabilities || [],
    }),
    onSuccess,
  })

  const updateMutation = useMutation({
    mutationFn: (data: FormData) => datasourcesApi.update(initialData!.id, {
      ...data,
      config: data.config || {},
      capabilities: data.capabilities || [],
    }),
    onSuccess,
  })

  const testMutation = useMutation({
    mutationFn: () => {
      if (!initialData) throw new Error('需要先保存')
      return datasourcesApi.test(initialData.id)
    },
  })

  const watchPlugin = form.watch('plugin')

  useEffect(() => {
    if (plugins && watchPlugin) {
      const plugin = plugins.find(p => p.name === watchPlugin)
      setSelectedPlugin(plugin || null)
    }
  }, [plugins, watchPlugin])

  const onSubmit = (data: unknown) => {
    const formData = data as FormData
    if (initialData) {
      updateMutation.mutate(formData)
    } else {
      createMutation.mutate(formData)
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {/* 基本信息 */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium">基本信息</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">名称 *</Label>
            <Input
              id="name"
              {...form.register('name')}
              placeholder="输入数据源名称"
            />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">类型 *</Label>
            <Select
              value={form.watch('type')}
              onValueChange={(value) => form.setValue('type', value as DataSourceType)}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="api">API</SelectItem>
                <SelectItem value="database">数据库</SelectItem>
                <SelectItem value="file">文件</SelectItem>
                <SelectItem value="message_queue">消息队列</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="plugin">插件 *</Label>
          <Select
            value={form.watch('plugin')}
            onValueChange={(value) => form.setValue('plugin', value)}
            disabled={loadingPlugins}
          >
            <SelectTrigger>
              <SelectValue placeholder={loadingPlugins ? '加载中...' : '选择插件'} />
            </SelectTrigger>
            <SelectContent>
              {plugins?.map((plugin) => (
                <SelectItem key={plugin.name} value={plugin.name}>
                  <div className="flex items-center space-x-2">
                    <span>{plugin.displayName}</span>
                    <span className="text-xs text-muted-foreground">({plugin.name})</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedPlugin?.description && (
            <p className="text-sm text-muted-foreground">{selectedPlugin.description}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">描述</Label>
          <Textarea
            id="description"
            {...form.register('description')}
            placeholder="输入描述信息"
            rows={2}
          />
        </div>
      </div>

      {/* 连接配置 - 根据插件动态渲染 */}
      {selectedPlugin && selectedPlugin.configSchema.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium">连接配置</h3>
          
          <div className="space-y-4">
            {selectedPlugin.configSchema.map((field) => (
              <div key={field.name} className="space-y-2">
                <Label htmlFor={`config.${field.name}`}>
                  {field.label}
                  {field.required && ' *'}
                </Label>
                
                {field.type === 'string' && (
                  <Input
                    id={`config.${field.name}`}
                    value={(form.watch('config') as Record<string, string>)[field.name] || ''}
                    onChange={(e) => {
                      const config = { ...form.watch('config'), [field.name]: e.target.value }
                      form.setValue('config', config)
                    }}
                    placeholder={field.description}
                  />
                )}

                {field.type === 'secret' && (
                  <Input
                    id={`config.${field.name}`}
                    type="password"
                    value={(form.watch('config') as Record<string, string>)[field.name] || ''}
                    onChange={(e) => {
                      const config = { ...form.watch('config'), [field.name]: e.target.value }
                      form.setValue('config', config)
                    }}
                    placeholder={field.description}
                  />
                )}

                {field.type === 'number' && (
                  <Input
                    id={`config.${field.name}`}
                    type="number"
                    value={(form.watch('config') as Record<string, number>)[field.name] || ''}
                    onChange={(e) => {
                      const config = { ...form.watch('config'), [field.name]: Number(e.target.value) }
                      form.setValue('config', config)
                    }}
                    placeholder={field.description}
                  />
                )}

                {field.type === 'boolean' && (
                  <div className="flex items-center space-x-2">
                    <Switch
                      id={`config.${field.name}`}
                      checked={(form.watch('config') as Record<string, boolean>)[field.name] || false}
                      onCheckedChange={(checked) => {
                        const config = { ...form.watch('config'), [field.name]: checked }
                        form.setValue('config', config)
                      }}
                    />
                    {field.description && (
                      <span className="text-sm text-muted-foreground">{field.description}</span>
                    )}
                  </div>
                )}

                {field.type === 'select' && field.options && (
                  <Select
                    value={(form.watch('config') as Record<string, string>)[field.name] || ''}
                    onValueChange={(value) => {
                      const config = { ...form.watch('config'), [field.name]: value }
                      form.setValue('config', config)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={field.description || '请选择'} />
                    </SelectTrigger>
                    <SelectContent>
                      {field.options.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 数据能力 */}
      {selectedPlugin?.capabilities && selectedPlugin.capabilities.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium">数据能力</h3>
          <div className="grid grid-cols-2 gap-2">
            {selectedPlugin.capabilities.map((cap) => {
              const currentCaps = form.watch('capabilities') || []
              const isChecked = currentCaps.includes(cap)
              return (
                <label
                  key={cap}
                  className="flex items-center space-x-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => {
                      const capabilities = form.watch('capabilities') || []
                      if (e.target.checked) {
                        form.setValue('capabilities', [...capabilities, cap])
                      } else {
                        form.setValue('capabilities', capabilities.filter(c => c !== cap))
                      }
                    }}
                    className="rounded border-input"
                  />
                  <span className="text-sm">{cap}</span>
                </label>
              )
            })}
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex justify-between pt-4 border-t">
        <div>
          {initialData && (
            <Button
              type="button"
              variant="outline"
              onClick={() => testMutation.mutate()}
              disabled={testMutation.isPending}
            >
              {testMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  测试中...
                </>
              ) : (
                '测试连接'
              )}
            </Button>
          )}
        </div>
        <div className="flex space-x-2">
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
      </div>
    </form>
  )
}
