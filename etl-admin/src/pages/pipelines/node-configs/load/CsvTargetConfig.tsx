import { Save } from 'lucide-react'
import {
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from '@/components/ui'
import { FieldSelector } from '../shared'
import type { NodeConfigProps, CsvTargetConfig as CsvTargetConfigType, FieldInfo } from '../types'

const DEFAULT_FIELDS: FieldInfo[] = [
  { name: 'id', type: 'string' },
  { name: 'created_at', type: 'string' },
  { name: 'value', type: 'string' },
]

export function CsvTargetConfig({ config, onChange }: NodeConfigProps<CsvTargetConfigType>) {
  const current: CsvTargetConfigType = {
    outputType: 'download',
    encoding: 'utf-8',
    delimiter: ',',
    includeHeader: true,
    selectedFields: [],
    ...config,
  }

  const update = (updates: Partial<CsvTargetConfigType>) => {
    onChange({ ...current, ...updates })
  }

  const fields: FieldInfo[] = current.selectedFields?.length
    ? current.selectedFields.map((f) => ({ name: f, type: 'string' }))
    : DEFAULT_FIELDS

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-sm">输出方式</Label>
          <Select
            value={current.outputType}
            onValueChange={(v) => update({ outputType: v as CsvTargetConfigType['outputType'] })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="download">直接下载</SelectItem>
              <SelectItem value="path">保存到路径</SelectItem>
              <SelectItem value="s3">上传到 S3</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-sm">编码</Label>
          <Select
            value={current.encoding}
            onValueChange={(v) => update({ encoding: v as CsvTargetConfigType['encoding'] })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="utf-8">UTF-8</SelectItem>
              <SelectItem value="gbk">GBK</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {current.outputType === 'path' && (
        <div className="space-y-2">
          <Label className="text-sm">输出路径</Label>
          <Input
            value={current.outputPath || ''}
            onChange={(e) => update({ outputPath: e.target.value })}
            placeholder="/data/output/result.csv"
          />
        </div>
      )}

      {current.outputType === 's3' && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm">Bucket</Label>
            <Input
              value={current.s3Bucket || ''}
              onChange={(e) => update({ s3Bucket: e.target.value })}
              placeholder="my-bucket"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Region</Label>
            <Input
              value={current.s3Region || ''}
              onChange={(e) => update({ s3Region: e.target.value })}
              placeholder="us-east-1"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm">路径</Label>
            <Input
              value={current.s3Path || ''}
              onChange={(e) => update({ s3Path: e.target.value })}
              placeholder="export/data.csv"
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label className="text-sm">分隔符</Label>
          <Select
            value={current.delimiter}
            onValueChange={(v) => update({ delimiter: v as CsvTargetConfigType['delimiter'] })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value=",">逗号 (,)</SelectItem>
              <SelectItem value="\t">Tab</SelectItem>
              <SelectItem value=";">分号 (;)</SelectItem>
              <SelectItem value="|">竖线 (|)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 mt-6">
          <Switch
            checked={current.includeHeader}
            onCheckedChange={(v) => update({ includeHeader: v })}
          />
          <Label className="text-sm">包含表头</Label>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-sm">输出字段</Label>
        <FieldSelector
          fields={fields}
          selectedFields={current.selectedFields || []}
          onChange={(selected) => update({ selectedFields: selected })}
          label="选择输出字段"
        />
      </div>

      <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
        <Save className="w-4 h-4 mt-0.5" />
        <div className="space-y-1">
          <div>提示：</div>
          <div className="flex flex-col gap-1">
            <span>· 下载模式会在执行时生成文件供用户下载</span>
            <span>· 路径/ S3 模式请保证服务端有写入权限</span>
          </div>
        </div>
      </div>
    </div>
  )
}
