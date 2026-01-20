import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, RefreshCw, Search, Pencil, Trash2, Code } from 'lucide-react'
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
import { datasetsApi } from '@/api'
import type { DataSet, StorageType } from '@/types/etl'
import { DataSetForm } from './DataSetForm'

const storageLabels: Record<StorageType, string> = {
  postgres: 'PostgreSQL',
  clickhouse: 'ClickHouse',
  redis: 'Redis',
}

export default function DataSetsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [storageFilter, setStorageFilter] = useState<string>('all')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingDataSet, setEditingDataSet] = useState<DataSet | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<DataSet | null>(null)
  const [previewDDL, setPreviewDDL] = useState<{ dataset: DataSet; ddl: string } | null>(null)

  // 获取数据集列表
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['datasets', categoryFilter, storageFilter],
    queryFn: () => datasetsApi.list({
      category: categoryFilter !== 'all' ? categoryFilter : undefined,
      storage: storageFilter !== 'all' ? storageFilter : undefined,
    }),
  })

  // 获取分类列表
  const { data: categories } = useQuery({
    queryKey: ['dataset-categories'],
    queryFn: () => datasetsApi.getCategories(),
  })

  // 删除数据集
  const deleteMutation = useMutation({
    mutationFn: (id: string) => datasetsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['datasets'] })
      setDeleteConfirm(null)
    },
  })

  // 预览DDL
  const handlePreviewDDL = async (dataset: DataSet) => {
    try {
      const ddl = await datasetsApi.previewDDL(dataset.id)
      setPreviewDDL({ dataset, ddl })
    } catch (error) {
      console.error('Failed to preview DDL:', error)
    }
  }

  const handleEdit = (dataset: DataSet) => {
    setEditingDataSet(dataset)
    setIsFormOpen(true)
  }

  const handleCreate = () => {
    setEditingDataSet(null)
    setIsFormOpen(true)
  }

  const handleFormClose = () => {
    setIsFormOpen(false)
    setEditingDataSet(null)
  }

  const handleFormSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['datasets'] })
    handleFormClose()
  }

  const filteredData = data?.data.filter(ds =>
    ds.name.toLowerCase().includes(search.toLowerCase()) ||
    ds.description?.toLowerCase().includes(search.toLowerCase())
  ) || []

  // 按分类分组
  const groupedData = filteredData.reduce((acc, ds) => {
    const category = ds.category || '未分类'
    if (!acc[category]) acc[category] = []
    acc[category].push(ds)
    return acc
  }, {} as Record<string, DataSet[]>)

  return (
    <div className="flex flex-col h-full">
      <Header title="数据集管理" />
      
      <div className="flex-1 p-6 space-y-6">
        {/* 工具栏 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="搜索数据集..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="分类" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部分类</SelectItem>
                {categories?.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={storageFilter} onValueChange={setStorageFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="存储" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部存储</SelectItem>
                <SelectItem value="postgres">PostgreSQL</SelectItem>
                <SelectItem value="clickhouse">ClickHouse</SelectItem>
                <SelectItem value="redis">Redis</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="icon" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              新建数据集
            </Button>
          </div>
        </div>

        {/* 数据集列表 - 按分类分组 */}
        <div className="space-y-6">
          {isLoading ? (
            <Card>
              <CardContent className="py-8 text-center">加载中...</CardContent>
            </Card>
          ) : Object.keys(groupedData).length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                暂无数据集
              </CardContent>
            </Card>
          ) : (
            Object.entries(groupedData).map(([category, datasets]) => (
              <div key={category} className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground px-1">
                  {category} ({datasets.length})
                </h3>
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>名称</TableHead>
                          <TableHead>版本</TableHead>
                          <TableHead>字段数</TableHead>
                          <TableHead>存储</TableHead>
                          <TableHead>状态</TableHead>
                          <TableHead>更新时间</TableHead>
                          <TableHead className="w-32">操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {datasets.map((ds) => (
                          <TableRow key={ds.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium font-mono">{ds.name}</div>
                                {ds.description && (
                                  <div className="text-sm text-muted-foreground">{ds.description}</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">v{ds.version}</Badge>
                            </TableCell>
                            <TableCell>{ds.schema.fields.length} 字段</TableCell>
                            <TableCell>
                              <Badge variant="secondary">
                                {storageLabels[ds.storage.type]}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={ds.status === 'active' ? 'success' : 'default'}>
                                {ds.status === 'active' ? '已启用' : '未启用'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(ds.updatedAt).toLocaleString('zh-CN')}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handlePreviewDDL(ds)}
                                  title="预览DDL"
                                >
                                  <Code className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEdit(ds)}
                                  title="编辑"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setDeleteConfirm(ds)}
                                  title="删除"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 新建/编辑表单 */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingDataSet ? '编辑数据集' : '新建数据集'}</DialogTitle>
            <DialogDescription>
              定义数据集的 Schema 和存储配置
            </DialogDescription>
          </DialogHeader>
          <DataSetForm
            initialData={editingDataSet}
            onSuccess={handleFormSuccess}
            onCancel={handleFormClose}
          />
        </DialogContent>
      </Dialog>

      {/* DDL预览 */}
      <Dialog open={!!previewDDL} onOpenChange={() => setPreviewDDL(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>DDL 预览 - {previewDDL?.dataset.name}</DialogTitle>
          </DialogHeader>
          <pre className="bg-muted p-4 rounded-lg overflow-auto max-h-96 text-sm">
            <code>{previewDDL?.ddl}</code>
          </pre>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewDDL(null)}>
              关闭
            </Button>
            <Button onClick={() => {
              navigator.clipboard.writeText(previewDDL?.ddl || '')
            }}>
              复制
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认 */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除数据集 "{deleteConfirm?.name}" 吗？此操作不可撤销。
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
