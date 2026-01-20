import { useState } from 'react'
import { RefreshCw, Download, ChevronLeft, ChevronRight } from 'lucide-react'
import {
  Button,
  Label,
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui'

interface DataPreviewProps {
  data: Record<string, any>[]
  columns?: string[]
  isLoading?: boolean
  error?: string | null
  onRefresh?: () => void
  onDownload?: () => void
  title?: string
  maxRows?: number
  showPagination?: boolean
}

export function DataPreview({
  data,
  columns: propColumns,
  isLoading = false,
  error = null,
  onRefresh,
  onDownload,
  title = '数据预览',
  maxRows = 100,
  showPagination = true,
}: DataPreviewProps) {
  const [page, setPage] = useState(0)
  const pageSize = 10

  // 自动检测列
  const columns = propColumns || (data.length > 0 ? Object.keys(data[0]) : [])
  
  // 分页数据
  const totalPages = Math.ceil(Math.min(data.length, maxRows) / pageSize)
  const displayData = data.slice(page * pageSize, (page + 1) * pageSize)

  // 格式化单元格值
  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return '-'
    if (typeof value === 'object') return JSON.stringify(value)
    if (typeof value === 'boolean') return value ? 'true' : 'false'
    return String(value)
  }

  // 获取值类型样式
  const getValueStyle = (value: any): string => {
    if (value === null || value === undefined) return 'text-muted-foreground italic'
    if (typeof value === 'number') return 'text-blue-600 font-mono'
    if (typeof value === 'boolean') return 'text-purple-600'
    if (typeof value === 'object') return 'text-orange-600 font-mono text-xs'
    return ''
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium">{title}</Label>
          {!isLoading && data.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {data.length > maxRows ? `${maxRows}+` : data.length} 行
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          {onRefresh && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={`w-3 h-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              刷新
            </Button>
          )}
          {onDownload && data.length > 0 && (
            <Button variant="ghost" size="sm" onClick={onDownload}>
              <Download className="w-3 h-3 mr-1" />
              导出
            </Button>
          )}
        </div>
      </div>

      {/* 错误信息 */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      {/* 加载中 */}
      {isLoading && (
        <div className="border rounded-lg p-8 text-center text-muted-foreground">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
          <p className="text-sm">加载中...</p>
        </div>
      )}

      {/* 无数据 */}
      {!isLoading && !error && data.length === 0 && (
        <div className="border border-dashed rounded-lg p-8 text-center text-muted-foreground">
          <p className="text-sm">暂无数据</p>
          <p className="text-xs mt-1">配置完成后点击预览</p>
        </div>
      )}

      {/* 数据表格 */}
      {!isLoading && !error && data.length > 0 && (
        <>
          <div className="border rounded-lg overflow-auto max-h-80">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-10 text-center">#</TableHead>
                  {columns.map(col => (
                    <TableHead key={col} className="whitespace-nowrap font-mono text-xs">
                      {col}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayData.map((row, rowIndex) => (
                  <TableRow key={rowIndex}>
                    <TableCell className="text-center text-xs text-muted-foreground">
                      {page * pageSize + rowIndex + 1}
                    </TableCell>
                    {columns.map(col => (
                      <TableCell 
                        key={col} 
                        className={`text-sm max-w-48 truncate ${getValueStyle(row[col])}`}
                        title={formatValue(row[col])}
                      >
                        {formatValue(row[col])}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* 分页 */}
          {showPagination && totalPages > 1 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                显示 {page * pageSize + 1} - {Math.min((page + 1) * pageSize, data.length)} 条
                {data.length > maxRows && ` (共 ${data.length} 条，仅显示前 ${maxRows} 条)`}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="px-2 text-muted-foreground">
                  {page + 1} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// 简化版预览（只显示字段和类型）
interface SchemaPreviewProps {
  fields: Array<{ name: string; type: string; comment?: string }>
  title?: string
}

export function SchemaPreview({ fields, title = 'Schema' }: SchemaPreviewProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label className="text-sm font-medium">{title}</Label>
        <Badge variant="secondary" className="text-xs">{fields.length} 字段</Badge>
      </div>
      <div className="border rounded-lg divide-y max-h-48 overflow-auto">
        {fields.map(field => (
          <div key={field.name} className="flex items-center justify-between px-3 py-2">
            <div>
              <span className="font-mono text-sm">{field.name}</span>
              {field.comment && (
                <span className="text-xs text-muted-foreground ml-2">{field.comment}</span>
              )}
            </div>
            <Badge variant="outline" className="text-xs">{field.type}</Badge>
          </div>
        ))}
      </div>
    </div>
  )
}
