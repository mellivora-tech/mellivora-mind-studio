import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus,
  RefreshCw,
  Search,
  Pencil,
  Trash2,
  Play,
  Clock,
} from 'lucide-react'
import { Header } from '@/components/layout'
import {
  Button,
  Input,
  Badge,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Switch,
  Label,
  Textarea,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui'
import { schedulesApi, pipelinesApi } from '@/api'
import type { Schedule, DAGNode, Pipeline } from '@/types/etl'

// Cron presets
const cronPresets = [
  { label: '每分钟', value: '* * * * *', description: '每分钟执行一次' },
  { label: '每小时', value: '0 * * * *', description: '每小时整点执行' },
  { label: '每天 09:00', value: '0 9 * * *', description: '每天早上9点执行' },
  { label: '每天 18:00', value: '0 18 * * *', description: '每天下午6点执行' },
  { label: '每周一 09:00', value: '0 9 * * 1', description: '每周一早上9点执行' },
  { label: '每月1号', value: '0 9 1 * *', description: '每月1号早上9点执行' },
]

// Timezone options
const timezones = [
  { label: '中国标准时间 (UTC+8)', value: 'Asia/Shanghai' },
  { label: 'UTC', value: 'UTC' },
  { label: '美东时间', value: 'America/New_York' },
  { label: '美西时间', value: 'America/Los_Angeles' },
]

// Parse cron to human readable (simplified)
function describeCron(cron: string): string {
  const preset = cronPresets.find(p => p.value === cron)
  if (preset) return preset.description
  
  const parts = cron.split(' ')
  if (parts.length !== 5) return cron
  
  const [minute, hour, day, month, weekday] = parts
  
  if (minute === '*' && hour === '*') return '每分钟'
  if (minute === '0' && hour === '*') return '每小时整点'
  if (minute !== '*' && hour !== '*' && day === '*' && month === '*' && weekday === '*') {
    return `每天 ${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`
  }
  
  return cron
}

// Empty schedule form
const emptySchedule: Partial<Schedule> = {
  name: '',
  description: '',
  cronExpr: '0 9 * * *',
  timezone: 'Asia/Shanghai',
  enabled: true,
  dag: [],
}

export default function SchedulesPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null)
  const [formData, setFormData] = useState<Partial<Schedule>>(emptySchedule)
  const [deleteConfirm, setDeleteConfirm] = useState<Schedule | null>(null)

  // Fetch schedules
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['schedules', statusFilter],
    queryFn: () => schedulesApi.list({
      enabled: statusFilter !== 'all' ? statusFilter === 'enabled' : undefined,
    }),
  })

  // Fetch pipelines for DAG selection
  const { data: pipelinesData } = useQuery({
    queryKey: ['pipelines'],
    queryFn: () => pipelinesApi.list({ pageSize: 100 }),
  })

  const pipelines = pipelinesData?.data || []

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: Partial<Schedule>) => schedulesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] })
      handleFormClose()
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Schedule> }) =>
      schedulesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] })
      handleFormClose()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => schedulesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] })
      setDeleteConfirm(null)
    },
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      enabled ? schedulesApi.enable(id) : schedulesApi.disable(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] })
    },
  })

  const triggerMutation = useMutation({
    mutationFn: (id: string) => schedulesApi.trigger(id),
  })

  const handleCreate = () => {
    setEditingSchedule(null)
    setFormData(emptySchedule)
    setIsFormOpen(true)
  }

  const handleEdit = (schedule: Schedule) => {
    setEditingSchedule(schedule)
    setFormData({
      name: schedule.name,
      description: schedule.description,
      cronExpr: schedule.cronExpr,
      timezone: schedule.timezone,
      enabled: schedule.enabled,
      dag: schedule.dag,
    })
    setIsFormOpen(true)
  }

  const handleFormClose = () => {
    setIsFormOpen(false)
    setEditingSchedule(null)
    setFormData(emptySchedule)
  }

  const handleSave = () => {
    if (editingSchedule) {
      updateMutation.mutate({ id: editingSchedule.id, data: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  const addDagNode = (pipeline: Pipeline) => {
    const newNode: DAGNode = {
      id: `node-${Date.now()}`,
      name: pipeline.name,
      pipelineId: pipeline.id,
      dependsOn: [],
      timeout: 3600,
      retries: 3,
    }
    setFormData(prev => ({
      ...prev,
      dag: [...(prev.dag || []), newNode],
    }))
  }

  const removeDagNode = (nodeId: string) => {
    setFormData(prev => ({
      ...prev,
      dag: (prev.dag || []).filter(n => n.id !== nodeId).map(n => ({
        ...n,
        dependsOn: n.dependsOn.filter(d => d !== nodeId),
      })),
    }))
  }

  const updateDagNode = (nodeId: string, updates: Partial<DAGNode>) => {
    setFormData(prev => ({
      ...prev,
      dag: (prev.dag || []).map(n =>
        n.id === nodeId ? { ...n, ...updates } : n
      ),
    }))
  }

  const filteredData = data?.data.filter(schedule =>
    schedule.name.toLowerCase().includes(search.toLowerCase()) ||
    schedule.description?.toLowerCase().includes(search.toLowerCase())
  ) || []

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <div className="flex flex-col h-full">
      <Header title="调度管理" />

      <div className="flex-1 p-6 space-y-6">
        {/* Toolbar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="搜索调度..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="enabled">已启用</SelectItem>
                <SelectItem value="disabled">已禁用</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="icon" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              新建调度
            </Button>
          </div>
        </div>

        {/* Schedule List */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>名称</TableHead>
                  <TableHead>Cron 表达式</TableHead>
                  <TableHead>时区</TableHead>
                  <TableHead>管道数</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>下次执行</TableHead>
                  <TableHead className="w-32">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      加载中...
                    </TableCell>
                  </TableRow>
                ) : filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      暂无调度任务
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((schedule) => (
                    <TableRow key={schedule.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{schedule.name}</div>
                          {schedule.description && (
                            <div className="text-sm text-muted-foreground">
                              {schedule.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <code className="text-sm bg-muted px-1.5 py-0.5 rounded">
                            {schedule.cronExpr}
                          </code>
                          <div className="text-xs text-muted-foreground mt-1">
                            {describeCron(schedule.cronExpr)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{schedule.timezone}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{schedule.dag.length} 个</Badge>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={schedule.enabled}
                          onCheckedChange={(checked) =>
                            toggleMutation.mutate({ id: schedule.id, enabled: checked })
                          }
                        />
                      </TableCell>
                      <TableCell className="text-sm">
                        {schedule.nextRunAt ? (
                          <div className="flex items-center text-muted-foreground">
                            <Clock className="h-3 w-3 mr-1" />
                            {new Date(schedule.nextRunAt).toLocaleString('zh-CN')}
                          </div>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => triggerMutation.mutate(schedule.id)}
                            disabled={triggerMutation.isPending}
                            title="立即执行"
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(schedule)}
                            title="编辑"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteConfirm(schedule)}
                            title="删除"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Schedule Editor Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSchedule ? '编辑调度' : '新建调度'}
            </DialogTitle>
            <DialogDescription>
              配置定时任务和管道执行顺序
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="basic" className="mt-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">基本信息</TabsTrigger>
              <TabsTrigger value="schedule">调度配置</TabsTrigger>
              <TabsTrigger value="dag">DAG 设计</TabsTrigger>
            </TabsList>

            {/* Basic Info */}
            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="name">名称 *</Label>
                <Input
                  id="name"
                  value={formData.name || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="输入调度名称"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">描述</Label>
                <Textarea
                  id="description"
                  value={formData.description || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="描述调度任务的用途..."
                  rows={3}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="enabled"
                  checked={formData.enabled}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, enabled: checked }))}
                />
                <Label htmlFor="enabled">启用调度</Label>
              </div>
            </TabsContent>

            {/* Schedule Config */}
            <TabsContent value="schedule" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>快捷设置</Label>
                <div className="flex flex-wrap gap-2">
                  {cronPresets.map((preset) => (
                    <Button
                      key={preset.value}
                      variant={formData.cronExpr === preset.value ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFormData(prev => ({ ...prev, cronExpr: preset.value }))}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cron">Cron 表达式 *</Label>
                <Input
                  id="cron"
                  value={formData.cronExpr || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, cronExpr: e.target.value }))}
                  placeholder="* * * * *"
                  className="font-mono"
                />
                <p className="text-sm text-muted-foreground">
                  格式: 分 时 日 月 周 | 当前: {describeCron(formData.cronExpr || '')}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone">时区</Label>
                <Select
                  value={formData.timezone}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, timezone: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timezones.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            {/* DAG Design */}
            <TabsContent value="dag" className="mt-4">
              <div className="grid grid-cols-3 gap-4">
                {/* Available Pipelines */}
                <div className="space-y-2">
                  <Label>可用管道</Label>
                  <div className="border rounded-lg p-2 h-64 overflow-y-auto space-y-2">
                    {pipelines.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        暂无可用管道
                      </p>
                    ) : (
                      pipelines.map((pipeline) => (
                        <div
                          key={pipeline.id}
                          className="flex items-center justify-between p-2 border rounded hover:bg-muted cursor-pointer"
                          onClick={() => addDagNode(pipeline)}
                        >
                          <div className="text-sm font-medium">{pipeline.name}</div>
                          <Plus className="h-4 w-4 text-muted-foreground" />
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* DAG Nodes */}
                <div className="col-span-2 space-y-2">
                  <Label>执行顺序 (DAG)</Label>
                  <div className="border rounded-lg p-2 h-64 overflow-y-auto space-y-2">
                    {(formData.dag || []).length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        点击左侧管道添加到调度
                      </p>
                    ) : (
                      (formData.dag || []).map((node, index) => (
                        <Card key={node.id} className="p-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-2">
                              <Badge variant="outline">{index + 1}</Badge>
                              <div>
                                <div className="font-medium text-sm">{node.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  超时: {node.timeout}s | 重试: {node.retries}次
                                </div>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeDagNode(node.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          {(formData.dag || []).length > 1 && (
                            <div className="mt-2">
                              <Label className="text-xs">依赖节点</Label>
                              <Select
                                value={node.dependsOn[0] || ''}
                                onValueChange={(value) =>
                                  updateDagNode(node.id, {
                                    dependsOn: value ? [value] : [],
                                  })
                                }
                              >
                                <SelectTrigger className="h-8 mt-1">
                                  <SelectValue placeholder="选择依赖..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="">无依赖</SelectItem>
                                  {(formData.dag || [])
                                    .filter(n => n.id !== node.id)
                                    .map(n => (
                                      <SelectItem key={n.id} value={n.id}>
                                        {n.name}
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </Card>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={handleFormClose}>
              取消
            </Button>
            <Button onClick={handleSave} disabled={isPending || !formData.name}>
              {isPending ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除调度 "{deleteConfirm?.name}" 吗？此操作不可撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm.id)}
              disabled={deleteMutation.isPending}
            >
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
