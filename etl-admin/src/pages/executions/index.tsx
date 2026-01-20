import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  RefreshCw,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  StopCircle,
  RotateCcw,
  Eye,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Header } from '@/components/layout'
import {
  Button,
  Input,
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
  DialogHeader,
  DialogTitle,
} from '@/components/ui'
import { executionsApi } from '@/api'
import type { Execution, ExecutionStatus, TaskExecution } from '@/types/etl'

// Status configuration
const statusConfig: Record<ExecutionStatus, {
  label: string
  variant: 'default' | 'success' | 'destructive' | 'secondary'
  icon: typeof CheckCircle
}> = {
  pending: { label: '等待中', variant: 'secondary', icon: Clock },
  running: { label: '运行中', variant: 'default', icon: Clock },
  success: { label: '成功', variant: 'success', icon: CheckCircle },
  failed: { label: '失败', variant: 'destructive', icon: XCircle },
  cancelled: { label: '已取消', variant: 'secondary', icon: StopCircle },
}

// Format duration
function formatDuration(ms?: number): string {
  if (!ms) return '-'
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  if (minutes < 60) return `${minutes}m ${remainingSeconds}s`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return `${hours}h ${remainingMinutes}m`
}

// Task status badge
function TaskStatusBadge({ status }: { status: ExecutionStatus }) {
  const config = statusConfig[status]
  const Icon = config.icon
  return (
    <Badge variant={config.variant} className="gap-1">
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  )
}

// Expandable task list
function TaskList({ tasks }: { tasks: TaskExecution[] }) {
  const [expanded, setExpanded] = useState(false)
  
  if (tasks.length === 0) {
    return <span className="text-muted-foreground text-sm">无任务</span>
  }
  
  const displayTasks = expanded ? tasks : tasks.slice(0, 2)
  
  return (
    <div className="space-y-1">
      {displayTasks.map((task) => (
        <div key={task.id} className="flex items-center justify-between text-sm">
          <span className="truncate max-w-32">{task.nodeName}</span>
          <TaskStatusBadge status={task.status} />
        </div>
      ))}
      {tasks.length > 2 && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full h-6 text-xs"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? (
            <>收起 <ChevronUp className="h-3 w-3 ml-1" /></>
          ) : (
            <>展开 {tasks.length - 2} 项 <ChevronDown className="h-3 w-3 ml-1" /></>
          )}
        </Button>
      )}
    </div>
  )
}

export default function ExecutionsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedExecution, setSelectedExecution] = useState<Execution | null>(null)
  const [logsDialogOpen, setLogsDialogOpen] = useState(false)

  // Fetch executions
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['executions', statusFilter],
    queryFn: () => executionsApi.list({
      status: statusFilter !== 'all' ? statusFilter : undefined,
      pageSize: 50,
    }),
    refetchInterval: 10000, // Refresh every 10s for running executions
  })

  // Fetch logs for selected execution
  const { data: logs, isLoading: logsLoading } = useQuery({
    queryKey: ['execution-logs', selectedExecution?.id],
    queryFn: () => selectedExecution ? executionsApi.getLogs(selectedExecution.id) : Promise.resolve([]),
    enabled: !!selectedExecution && logsDialogOpen,
  })

  // Mutations
  const cancelMutation = useMutation({
    mutationFn: (id: string) => executionsApi.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['executions'] })
    },
  })

  const retryMutation = useMutation({
    mutationFn: (id: string) => executionsApi.retry(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['executions'] })
    },
  })

  const handleViewLogs = (execution: Execution) => {
    setSelectedExecution(execution)
    setLogsDialogOpen(true)
  }

  const filteredData = data?.data.filter(execution => {
    const matchesSearch = 
      execution.scheduleName?.toLowerCase().includes(search.toLowerCase()) ||
      execution.pipelineName?.toLowerCase().includes(search.toLowerCase()) ||
      execution.id.toLowerCase().includes(search.toLowerCase())
    return matchesSearch
  }) || []

  return (
    <div className="flex flex-col h-full">
      <Header title="执行监控" />

      <div className="flex-1 p-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-5">
          {Object.entries(statusConfig).map(([status, config]) => {
            const count = data?.data.filter(e => e.status === status).length || 0
            const Icon = config.icon
            return (
              <Card key={status} className="cursor-pointer hover:border-primary/50" onClick={() => setStatusFilter(status)}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{config.label}</CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{count}</div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="搜索执行..."
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
                <SelectItem value="all">全部状态</SelectItem>
                {Object.entries(statusConfig).map(([value, config]) => (
                  <SelectItem key={value} value={value}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Execution List */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>执行 ID</TableHead>
                  <TableHead>调度/管道</TableHead>
                  <TableHead>触发方式</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>任务进度</TableHead>
                  <TableHead>开始时间</TableHead>
                  <TableHead>耗时</TableHead>
                  <TableHead className="w-28">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      加载中...
                    </TableCell>
                  </TableRow>
                ) : filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      暂无执行记录
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((execution) => {
                    const config = statusConfig[execution.status]
                    const Icon = config.icon
                    const isRunning = execution.status === 'running'
                    const canRetry = execution.status === 'failed' || execution.status === 'cancelled'
                    
                    return (
                      <TableRow key={execution.id}>
                        <TableCell>
                          <code className="text-sm bg-muted px-1.5 py-0.5 rounded">
                            {execution.id.slice(0, 8)}
                          </code>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {execution.scheduleName || execution.pipelineName || '-'}
                            </div>
                            {execution.scheduleName && execution.pipelineName && (
                              <div className="text-xs text-muted-foreground">
                                {execution.pipelineName}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {execution.trigger === 'scheduled' ? '定时' :
                             execution.trigger === 'manual' ? '手动' : '重试'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={config.variant} className={`gap-1 ${isRunning ? 'animate-pulse' : ''}`}>
                            <Icon className="h-3 w-3" />
                            {config.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <TaskList tasks={execution.tasks} />
                        </TableCell>
                        <TableCell className="text-sm">
                          {execution.startedAt
                            ? new Date(execution.startedAt).toLocaleString('zh-CN')
                            : '-'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDuration(execution.duration)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleViewLogs(execution)}
                              title="查看日志"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {isRunning && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => cancelMutation.mutate(execution.id)}
                                disabled={cancelMutation.isPending}
                                title="取消执行"
                              >
                                <StopCircle className="h-4 w-4" />
                              </Button>
                            )}
                            {canRetry && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => retryMutation.mutate(execution.id)}
                                disabled={retryMutation.isPending}
                                title="重试"
                              >
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Logs Dialog */}
      <Dialog open={logsDialogOpen} onOpenChange={setLogsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              执行日志
              {selectedExecution && (
                <Badge variant="outline">
                  {selectedExecution.id.slice(0, 8)}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {/* Task Summary */}
          {selectedExecution && (
            <div className="grid grid-cols-4 gap-4 py-4 border-b">
              {selectedExecution.tasks.map((task) => (
                <Card key={task.id} className="p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium truncate">{task.nodeName}</span>
                    <TaskStatusBadge status={task.status} />
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {task.inputRows !== undefined && `输入: ${task.inputRows} 行`}
                    {task.outputRows !== undefined && ` | 输出: ${task.outputRows} 行`}
                  </div>
                  {task.error && (
                    <div className="text-xs text-destructive mt-1 truncate" title={task.error}>
                      {task.error}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
          
          {/* Logs */}
          <div className="bg-slate-950 rounded-lg p-4 h-96 overflow-auto font-mono text-sm">
            {logsLoading ? (
              <div className="text-slate-400">加载日志中...</div>
            ) : !logs || logs.length === 0 ? (
              <div className="text-slate-400">暂无日志</div>
            ) : (
              logs.map((line, i) => (
                <div key={i} className="text-slate-200 whitespace-pre-wrap">
                  {line}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
