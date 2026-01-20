import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, RefreshCw, Search, Pencil, Trash2, Zap } from 'lucide-react'
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
} from '@/components/ui'
import { datasourcesApi } from '@/api'
import type { DataSource, DataSourceType, DataSourceStatus } from '@/types/etl'
import { DataSourceForm } from './DataSourceForm'

const typeLabels: Record<DataSourceType, string> = {
  api: 'API',
  database: '数据库',
  file: '文件',
  message_queue: '消息队列',
}

const statusConfig: Record<DataSourceStatus, { label: string; variant: 'default' | 'success' | 'destructive' }> = {
  active: { label: '正常', variant: 'success' },
  inactive: { label: '未激活', variant: 'default' },
  error: { label: '错误', variant: 'destructive' },
}

export default function DataSourcesPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingSource, setEditingSource] = useState<DataSource | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<DataSource | null>(null)

  // 获取数据源列表
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['datasources', typeFilter, statusFilter],
    queryFn: () => datasourcesApi.list({
      type: typeFilter !== 'all' ? typeFilter : undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
    }),
  })

  // 删除数据源
  const deleteMutation = useMutation({
    mutationFn: (id: string) => datasourcesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['datasources'] })
      setDeleteConfirm(null)
    },
  })

  // 测试连接
  const testMutation = useMutation({
    mutationFn: (id: string) => datasourcesApi.test(id),
  })

  const handleEdit = (source: DataSource) => {
    setEditingSource(source)
    setIsFormOpen(true)
  }

  const handleCreate = () => {
    setEditingSource(null)
    setIsFormOpen(true)
  }

  const handleFormClose = () => {
    setIsFormOpen(false)
    setEditingSource(null)
  }

  const handleFormSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['datasources'] })
    handleFormClose()
  }

  const filteredData = data?.data.filter(source =>
    source.name.toLowerCase().includes(search.toLowerCase()) ||
    source.description?.toLowerCase().includes(search.toLowerCase())
  ) || []

  return (
    <div className="flex flex-col h-full">
      <Header title="数据源管理" />
      
      <div className="flex-1 p-6 space-y-6">
        {/* 工具栏 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="搜索数据源..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部类型</SelectItem>
                <SelectItem value="api">API</SelectItem>
                <SelectItem value="database">数据库</SelectItem>
                <SelectItem value="file">文件</SelectItem>
                <SelectItem value="message_queue">消息队列</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="active">正常</SelectItem>
                <SelectItem value="inactive">未激活</SelectItem>
                <SelectItem value="error">错误</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="icon" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              新建数据源
            </Button>
          </div>
        </div>

        {/* 数据源列表 */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>名称</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>插件</TableHead>
                  <TableHead>能力</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>最后同步</TableHead>
                  <TableHead className="w-24">操作</TableHead>
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
                      暂无数据源
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((source) => (
                    <TableRow key={source.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{source.name}</div>
                          {source.description && (
                            <div className="text-sm text-muted-foreground">{source.description}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{typeLabels[source.type]}</TableCell>
                      <TableCell>
                        <code className="text-sm bg-muted px-1.5 py-0.5 rounded">
                          {source.plugin}
                        </code>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {source.capabilities.slice(0, 3).map((cap) => (
                            <Badge key={cap} variant="outline" className="text-xs">
                              {cap}
                            </Badge>
                          ))}
                          {source.capabilities.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{source.capabilities.length - 3}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusConfig[source.status].variant}>
                          {statusConfig[source.status].label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {source.lastSyncAt
                          ? new Date(source.lastSyncAt).toLocaleString('zh-CN')
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => testMutation.mutate(source.id)}
                            disabled={testMutation.isPending}
                          >
                            <Zap className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(source)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteConfirm(source)}
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

      {/* 新建/编辑表单 */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingSource ? '编辑数据源' : '新建数据源'}</DialogTitle>
            <DialogDescription>
              配置数据源连接信息和能力
            </DialogDescription>
          </DialogHeader>
          <DataSourceForm
            initialData={editingSource}
            onSuccess={handleFormSuccess}
            onCancel={handleFormClose}
          />
        </DialogContent>
      </Dialog>

      {/* 删除确认 */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除数据源 "{deleteConfirm?.name}" 吗？此操作不可撤销。
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
