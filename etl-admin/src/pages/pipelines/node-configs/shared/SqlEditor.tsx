import { useState } from 'react'
import { Play, Wand2, AlertCircle, CheckCircle } from 'lucide-react'
import {
  Button,
  Label,
  Textarea,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Badge,
} from '@/components/ui'

interface SqlParam {
  name: string
  type: 'string' | 'number' | 'date' | 'datetime'
  defaultValue?: string
  required: boolean
}

interface SqlEditorProps {
  value: string
  onChange: (sql: string) => void
  params?: SqlParam[]
  onParamsChange?: (params: SqlParam[]) => void
  onPreview?: (sql: string, params: SqlParam[]) => Promise<{ columns: string[], data: Record<string, any>[] }>
  onValidate?: (sql: string) => Promise<{ valid: boolean, message?: string }>
  placeholder?: string
  height?: string
}

export function SqlEditor({
  value,
  onChange,
  params = [],
  onParamsChange,
  onPreview,
  onValidate,
  placeholder = 'SELECT * FROM table_name WHERE ...',
  height = '200px',
}: SqlEditorProps) {
  const [isValidating, setIsValidating] = useState(false)
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [validationResult, setValidationResult] = useState<{ valid: boolean, message?: string } | null>(null)
  const [previewResult, setPreviewResult] = useState<{ columns: string[], data: Record<string, any>[] } | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)

  // 从 SQL 中提取参数 ${param_name}
  const extractParams = (sql: string): string[] => {
    const matches = sql.match(/\$\{(\w+)\}/g) || []
    return [...new Set(matches.map(m => m.replace(/\$\{|\}/g, '')))]
  }

  // 同步参数
  const syncParams = () => {
    const paramNames = extractParams(value)
    const newParams: SqlParam[] = paramNames.map(name => {
      const existing = params.find(p => p.name === name)
      return existing || {
        name,
        type: 'string',
        defaultValue: '',
        required: true,
      }
    })
    onParamsChange?.(newParams)
  }

  // 格式化 SQL
  const formatSql = () => {
    // 简单格式化：关键字大写，换行
    let formatted = value
      .replace(/\bselect\b/gi, 'SELECT')
      .replace(/\bfrom\b/gi, '\nFROM')
      .replace(/\bwhere\b/gi, '\nWHERE')
      .replace(/\band\b/gi, '\n  AND')
      .replace(/\bor\b/gi, '\n  OR')
      .replace(/\border by\b/gi, '\nORDER BY')
      .replace(/\bgroup by\b/gi, '\nGROUP BY')
      .replace(/\bhaving\b/gi, '\nHAVING')
      .replace(/\blimit\b/gi, '\nLIMIT')
      .replace(/\bjoin\b/gi, '\nJOIN')
      .replace(/\bleft join\b/gi, '\nLEFT JOIN')
      .replace(/\bright join\b/gi, '\nRIGHT JOIN')
      .replace(/\binner join\b/gi, '\nINNER JOIN')
      .replace(/\bon\b/gi, 'ON')
    onChange(formatted)
  }

  // 验证 SQL
  const handleValidate = async () => {
    if (!onValidate) return
    setIsValidating(true)
    setValidationResult(null)
    try {
      const result = await onValidate(value)
      setValidationResult(result)
    } catch (e: any) {
      setValidationResult({ valid: false, message: e.message })
    } finally {
      setIsValidating(false)
    }
  }

  // 预览结果
  const handlePreview = async () => {
    if (!onPreview) return
    setIsPreviewing(true)
    setPreviewResult(null)
    setPreviewError(null)
    try {
      const result = await onPreview(value, params)
      setPreviewResult(result)
    } catch (e: any) {
      setPreviewError(e.message)
    } finally {
      setIsPreviewing(false)
    }
  }

  // 更新参数
  const updateParam = (index: number, updates: Partial<SqlParam>) => {
    const newParams = [...params]
    newParams[index] = { ...newParams[index], ...updates }
    onParamsChange?.(newParams)
  }

  const detectedParams = extractParams(value)

  return (
    <div className="space-y-4">
      {/* SQL 编辑区 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">SQL 查询</Label>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={formatSql} title="格式化">
              <Wand2 className="w-3 h-3 mr-1" />
              格式化
            </Button>
            {onValidate && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleValidate}
                disabled={isValidating}
              >
                验证
              </Button>
            )}
            {onPreview && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handlePreview}
                disabled={isPreviewing || !value}
              >
                <Play className="w-3 h-3 mr-1" />
                预览
              </Button>
            )}
          </div>
        </div>
        
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="font-mono text-sm resize-none"
          style={{ height }}
        />
        
        {/* 验证结果 */}
        {validationResult && (
          <div className={`flex items-center gap-2 text-sm ${
            validationResult.valid ? 'text-green-600' : 'text-red-600'
          }`}>
            {validationResult.valid ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            {validationResult.message || (validationResult.valid ? 'SQL 语法正确' : 'SQL 语法错误')}
          </div>
        )}
      </div>

      {/* 参数绑定 */}
      {detectedParams.length > 0 && onParamsChange && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">
              参数绑定 
              <Badge variant="secondary" className="ml-2">{detectedParams.length}</Badge>
            </Label>
            <Button variant="ghost" size="sm" onClick={syncParams}>
              同步参数
            </Button>
          </div>
          
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-32">参数名</TableHead>
                  <TableHead className="w-28">类型</TableHead>
                  <TableHead>默认值</TableHead>
                  <TableHead className="w-16">必填</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {params.map((param, index) => (
                  <TableRow key={param.name}>
                    <TableCell className="font-mono text-sm">${`{${param.name}}`}</TableCell>
                    <TableCell>
                      <Select
                        value={param.type}
                        onValueChange={(val) => updateParam(index, { type: val as SqlParam['type'] })}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="string">字符串</SelectItem>
                          <SelectItem value="number">数字</SelectItem>
                          <SelectItem value="date">日期</SelectItem>
                          <SelectItem value="datetime">日期时间</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        value={param.defaultValue || ''}
                        onChange={(e) => updateParam(index, { defaultValue: e.target.value })}
                        placeholder={param.type === 'date' ? 'YYYY-MM-DD' : '默认值'}
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={param.required}
                        onChange={(e) => updateParam(index, { required: e.target.checked })}
                        className="w-4 h-4"
                      />
                    </TableCell>
                  </TableRow>
                ))}
                {params.length === 0 && detectedParams.length > 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-4">
                      点击"同步参数"从 SQL 中提取参数
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* 预览结果 */}
      {previewResult && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            预览结果 
            <Badge variant="secondary" className="ml-2">{previewResult.data.length} 行</Badge>
          </Label>
          <div className="border rounded-lg overflow-auto max-h-64">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  {previewResult.columns.map(col => (
                    <TableHead key={col} className="whitespace-nowrap">{col}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewResult.data.slice(0, 10).map((row, i) => (
                  <TableRow key={i}>
                    {previewResult.columns.map(col => (
                      <TableCell key={col} className="font-mono text-xs whitespace-nowrap">
                        {String(row[col] ?? '')}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {previewError && (
        <div className="flex items-center gap-2 text-sm text-red-600 p-3 bg-red-50 rounded-lg">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {previewError}
        </div>
      )}
    </div>
  )
}
