import { Textarea, Label, Switch } from '@/components/ui'
import type { NodeConfigProps, MapTransformConfig as MapTransformConfigType } from '../types'

export function MapTransformConfig({ config, onChange }: NodeConfigProps<MapTransformConfigType>) {
  const current: MapTransformConfigType = {
    mappings: [],
    dropUnmapped: false,
    ...config,
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-sm font-medium">字段映射 (一行一个)</Label>
        <Textarea
          rows={5}
          className="font-mono text-sm"
          placeholder={"src_field -> dst_field\nprice -> close_price\nid -> user_id"}
          value={current.mappings.map(m => `${m.sourceField || ''} -> ${m.targetField || ''}`).join('\n')}
          onChange={(e) => {
            const lines = e.target.value.split('\n').filter(Boolean)
            const mappings = lines.map(line => {
              const [src, dst] = line.split('->').map(s => s.trim())
              return { sourceField: src, targetField: dst || src, transform: 'none' as const }
            })
            onChange({ ...current, mappings })
          }}
        />
      </div>

      <div className="flex items-center gap-2">
        <Switch
          checked={current.dropUnmapped}
          onCheckedChange={(v) => onChange({ ...current, dropUnmapped: v })}
        />
        <Label className="text-sm">丢弃未映射的字段</Label>
      </div>
    </div>
  )
}
