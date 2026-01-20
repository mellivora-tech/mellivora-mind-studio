import { useState, useCallback } from 'react'
import { Upload, FileText, Globe, Server, Cloud } from 'lucide-react'
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Badge,
} from '@/components/ui'
import { DataPreview } from '../shared'
import type { NodeConfigProps, CsvSourceConfig as CsvSourceConfigType, FieldMapping } from '../types'

const ENCODINGS = [
  { value: 'utf-8', label: 'UTF-8' },
  { value: 'gbk', label: 'GBK' },
  { value: 'gb2312', label: 'GB2312' },
  { value: 'latin1', label: 'Latin-1' },
]

const DELIMITERS = [
  { value: ',', label: '逗号 (,)' },
  { value: '\t', label: 'Tab' },
  { value: ';', label: '分号 (;)' },
  { value: '|', label: '竖线 (|)' },
]

const FIELD_TYPES = [
  { value: 'string', label: '字符串' },
  { value: 'int', label: '整数' },
  { value: 'bigint', label: '长整数' },
  { value: 'float', label: '浮点数' },
  { value: 'decimal', label: '精确小数' },
  { value: 'date', label: '日期' },
  { value: 'datetime', label: '日期时间' },
  { value: 'bool', label: '布尔' },
]

export function CsvSourceConfig({ config, onChange }: NodeConfigProps<CsvSourceConfigType>) {
  const [isDragging, setIsDragging] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)

  // 默认配置
  const currentConfig: Partial<CsvSourceConfigType> = {
    sourceType: 'upload',
    encoding: 'utf-8',
    delimiter: ',',
    quoteChar: '"',
    hasHeader: true,
    skipRows: 0,
    fields: [],
    ...config,
  }

  // 更新配置
  const update = (updates: Partial<CsvSourceConfigType>) => {
    onChange({ ...currentConfig, ...updates })
  }

  // 处理文件上传
  const handleFileUpload = useCallback((file: File) => {
    setParseError(null)
    update({
      uploadedFile: file,
      uploadedFileName: file.name,
    })

    // 读取文件预览
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string
        const lines = text.split('\n').slice(0, 20) // 只读前20行
        const delimiter = currentConfig.delimiter || ','
        const hasHeader = currentConfig.hasHeader !== false

        // 解析字段
        const firstLine = lines[0]
        const headers = firstLine.split(delimiter).map(h => h.trim().replace(/^["']|["']$/g, ''))
        
        // 推断字段类型
        const dataLines = hasHeader ? lines.slice(1) : lines
        const fields: FieldMapping[] = headers.map((header, index) => {
          const sampleValues = dataLines
            .slice(0, 10)
            .map(line => line.split(delimiter)[index]?.trim().replace(/^["']|["']$/g, ''))
            .filter(Boolean)

          const inferredType = inferFieldType(sampleValues)
          
          return {
            sourceField: header,
            targetField: header.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
            targetType: inferredType,
            selected: true,
          }
        })

        // 解析预览数据
        const previewData = dataLines.slice(0, 10).map(line => {
          const values = line.split(delimiter).map(v => v.trim().replace(/^["']|["']$/g, ''))
          const row: Record<string, any> = {}
          headers.forEach((header, i) => {
            row[header] = values[i] || ''
          })
          return row
        })

        update({
          fields,
          previewData,
        })
      } catch (err: any) {
        setParseError(`解析文件失败: ${err.message}`)
      }
    }
    reader.onerror = () => {
      setParseError('读取文件失败')
    }
    reader.readAsText(file, currentConfig.encoding)
  }, [currentConfig.delimiter, currentConfig.hasHeader, currentConfig.encoding])

  // 推断字段类型
  const inferFieldType = (values: string[]): string => {
    if (values.length === 0) return 'string'
    
    // 检查是否全是数字
    if (values.every(v => /^-?\d+$/.test(v))) {
      const maxVal = Math.max(...values.map(Number))
      return maxVal > 2147483647 ? 'bigint' : 'int'
    }
    
    // 检查是否全是浮点数
    if (values.every(v => /^-?\d+\.?\d*$/.test(v))) {
      return 'float'
    }
    
    // 检查是否是日期
    if (values.every(v => /^\d{4}-\d{2}-\d{2}$/.test(v))) {
      return 'date'
    }
    
    // 检查是否是日期时间
    if (values.every(v => /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(v))) {
      return 'datetime'
    }
    
    // 检查是否是布尔
    if (values.every(v => ['true', 'false', '1', '0', 'yes', 'no'].includes(v.toLowerCase()))) {
      return 'bool'
    }
    
    return 'string'
  }

  // 拖拽处理
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file && (file.name.endsWith('.csv') || file.name.endsWith('.txt'))) {
      handleFileUpload(file)
    } else {
      setParseError('请上传 CSV 或 TXT 文件')
    }
  }

  // 更新字段配置
  const updateField = (index: number, updates: Partial<FieldMapping>) => {
    const newFields = [...(currentConfig.fields || [])]
    newFields[index] = { ...newFields[index], ...updates }
    update({ fields: newFields })
  }

  return (
    <div className="space-y-6">
      {/* 文件来源选择 */}
      <Tabs value={currentConfig.sourceType} onValueChange={(v) => update({ sourceType: v as CsvSourceConfigType['sourceType'] })}>
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="upload" className="text-xs">
            <Upload className="w-3 h-3 mr-1" />
            上传
          </TabsTrigger>
          <TabsTrigger value="url" className="text-xs">
            <Globe className="w-3 h-3 mr-1" />
            URL
          </TabsTrigger>
          <TabsTrigger value="sftp" className="text-xs">
            <Server className="w-3 h-3 mr-1" />
            SFTP
          </TabsTrigger>
          <TabsTrigger value="s3" className="text-xs">
            <Cloud className="w-3 h-3 mr-1" />
            S3
          </TabsTrigger>
        </TabsList>

        {/* 上传文件 */}
        <TabsContent value="upload" className="mt-4">
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {currentConfig.uploadedFileName ? (
              <div className="flex items-center justify-center gap-2">
                <FileText className="w-8 h-8 text-muted-foreground" />
                <div className="text-left">
                  <p className="font-medium">{currentConfig.uploadedFileName}</p>
                  <p className="text-xs text-muted-foreground">点击或拖拽新文件替换</p>
                </div>
              </div>
            ) : (
              <>
                <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">拖拽 CSV 文件到此处</p>
                <p className="text-xs text-muted-foreground mt-1">或</p>
              </>
            )}
            <label className="mt-2 inline-block">
              <input
                type="file"
                accept=".csv,.txt"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleFileUpload(file)
                }}
              />
              <Button variant="outline" size="sm" className="mt-2" asChild>
                <span>选择文件</span>
              </Button>
            </label>
          </div>
        </TabsContent>

        {/* URL */}
        <TabsContent value="url" className="mt-4 space-y-4">
          <div className="space-y-2">
            <Label>文件 URL</Label>
            <Input
              value={currentConfig.url || ''}
              onChange={(e) => update({ url: e.target.value })}
              placeholder="https://example.com/data.csv"
            />
          </div>
          <div className="space-y-2">
            <Label>自定义 Headers (可选)</Label>
            <div className="text-xs text-muted-foreground mb-2">
              添加认证或其他 HTTP Headers
            </div>
            {/* 简化版 Header 编辑 */}
            <Input
              placeholder="Authorization: Bearer token..."
              className="font-mono text-xs"
            />
          </div>
        </TabsContent>

        {/* SFTP */}
        <TabsContent value="sftp" className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>主机</Label>
              <Input
                value={currentConfig.sftpHost || ''}
                onChange={(e) => update({ sftpHost: e.target.value })}
                placeholder="sftp.example.com"
              />
            </div>
            <div className="space-y-2">
              <Label>端口</Label>
              <Input
                type="number"
                value={currentConfig.sftpPort || 22}
                onChange={(e) => update({ sftpPort: parseInt(e.target.value) })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>用户名</Label>
              <Input
                value={currentConfig.sftpUsername || ''}
                onChange={(e) => update({ sftpUsername: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>密码</Label>
              <Input
                type="password"
                value={currentConfig.sftpPassword || ''}
                onChange={(e) => update({ sftpPassword: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>文件路径</Label>
            <Input
              value={currentConfig.sftpPath || ''}
              onChange={(e) => update({ sftpPath: e.target.value })}
              placeholder="/data/files/data.csv"
            />
          </div>
        </TabsContent>

        {/* S3 */}
        <TabsContent value="s3" className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Bucket</Label>
              <Input
                value={currentConfig.s3Bucket || ''}
                onChange={(e) => update({ s3Bucket: e.target.value })}
                placeholder="my-bucket"
              />
            </div>
            <div className="space-y-2">
              <Label>Region</Label>
              <Select
                value={currentConfig.s3Region || 'us-east-1'}
                onValueChange={(v) => update({ s3Region: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="us-east-1">us-east-1</SelectItem>
                  <SelectItem value="us-west-2">us-west-2</SelectItem>
                  <SelectItem value="ap-northeast-1">ap-northeast-1</SelectItem>
                  <SelectItem value="ap-southeast-1">ap-southeast-1</SelectItem>
                  <SelectItem value="cn-north-1">cn-north-1</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>路径</Label>
              <Input
                value={currentConfig.s3Path || ''}
                onChange={(e) => update({ s3Path: e.target.value })}
                placeholder="data/2024/"
              />
            </div>
            <div className="space-y-2">
              <Label>文件模式</Label>
              <Input
                value={currentConfig.s3Pattern || ''}
                onChange={(e) => update({ s3Pattern: e.target.value })}
                placeholder="*.csv"
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* 解析设置 */}
      <div className="space-y-4 pt-4 border-t">
        <Label className="text-sm font-medium">解析设置</Label>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs">编码</Label>
            <Select
              value={currentConfig.encoding}
              onValueChange={(v) => update({ encoding: v as CsvSourceConfigType['encoding'] })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ENCODINGS.map(e => (
                  <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">分隔符</Label>
            <Select
              value={currentConfig.delimiter}
              onValueChange={(v) => update({ delimiter: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DELIMITERS.map(d => (
                  <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Switch
              checked={currentConfig.hasHeader}
              onCheckedChange={(v) => update({ hasHeader: v })}
            />
            <Label className="text-sm">首行为表头</Label>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-sm">跳过行数</Label>
            <Input
              type="number"
              value={currentConfig.skipRows}
              onChange={(e) => update({ skipRows: parseInt(e.target.value) || 0 })}
              className="w-20"
              min={0}
            />
          </div>
        </div>
      </div>

      {/* 错误信息 */}
      {parseError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {parseError}
        </div>
      )}

      {/* 字段配置 */}
      {currentConfig.fields && currentConfig.fields.length > 0 && (
        <div className="space-y-3 pt-4 border-t">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">字段配置</Label>
            <Badge variant="secondary">
              {currentConfig.fields.filter(f => f.selected).length} / {currentConfig.fields.length} 字段
            </Badge>
          </div>
          
          <div className="border rounded-lg overflow-auto max-h-64">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-10">选择</TableHead>
                  <TableHead>源字段</TableHead>
                  <TableHead>输出名称</TableHead>
                  <TableHead className="w-28">类型</TableHead>
                  <TableHead className="w-24">格式</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentConfig.fields.map((field, index) => (
                  <TableRow key={field.sourceField}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={field.selected}
                        onChange={(e) => updateField(index, { selected: e.target.checked })}
                        className="w-4 h-4"
                      />
                    </TableCell>
                    <TableCell className="font-mono text-sm">{field.sourceField}</TableCell>
                    <TableCell>
                      <Input
                        value={field.targetField}
                        onChange={(e) => updateField(index, { targetField: e.target.value })}
                        className="h-8 font-mono text-sm"
                        disabled={!field.selected}
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={field.targetType}
                        onValueChange={(v) => updateField(index, { targetType: v })}
                        disabled={!field.selected}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FIELD_TYPES.map(t => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {(field.targetType === 'date' || field.targetType === 'datetime') && (
                        <Input
                          value={field.format || ''}
                          onChange={(e) => updateField(index, { format: e.target.value })}
                          placeholder="YYYY-MM-DD"
                          className="h-8 text-xs"
                          disabled={!field.selected}
                        />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* 数据预览 */}
      {currentConfig.previewData && currentConfig.previewData.length > 0 && (
        <DataPreview
          data={currentConfig.previewData}
          title="数据预览 (前10行)"
        />
      )}
    </div>
  )
}
