import type { NodeConfigProps } from './types'

// Extract
import { CsvSourceConfig } from './extract/CsvSourceConfig.tsx'
import { PostgresSourceConfig } from './extract/PostgresSourceConfig.tsx'
import { ClickhouseSourceConfig } from './extract/ClickhouseSourceConfig.tsx'

// Transform
import { FilterTransformConfig } from './transform/FilterTransformConfig.tsx'
import { MapTransformConfig } from './transform/MapTransformConfig.tsx'
import { JoinTransformConfig } from './transform/JoinTransformConfig.tsx'
import { AggregateTransformConfig } from './transform/AggregateTransformConfig.tsx'
import { DedupeTransformConfig } from './transform/DedupeTransformConfig.tsx'

// Load
import { PostgresTargetConfig } from './load/PostgresTargetConfig.tsx'
import { ClickhouseTargetConfig } from './load/ClickhouseTargetConfig.tsx'
import { CsvTargetConfig } from './load/CsvTargetConfig.tsx'

export type ConfigComponent = React.ComponentType<NodeConfigProps<any>>

export const pluginConfigMap: Record<string, { type: 'extract' | 'transform' | 'load'; Component: ConfigComponent }> = {
  // Extract
  'source-csv': { type: 'extract', Component: CsvSourceConfig },
  'source-postgres': { type: 'extract', Component: PostgresSourceConfig },
  'source-clickhouse': { type: 'extract', Component: ClickhouseSourceConfig },

  // Transform
  'transform-filter': { type: 'transform', Component: FilterTransformConfig },
  'transform-map': { type: 'transform', Component: MapTransformConfig },
  'transform-join': { type: 'transform', Component: JoinTransformConfig },
  'transform-aggregate': { type: 'transform', Component: AggregateTransformConfig },
  'transform-dedupe': { type: 'transform', Component: DedupeTransformConfig },

  // Load
  'target-postgres': { type: 'load', Component: PostgresTargetConfig },
  'target-clickhouse': { type: 'load', Component: ClickhouseTargetConfig },
  'target-csv': { type: 'load', Component: CsvTargetConfig },
}

export const getConfigComponent = (plugin: string) => {
  return pluginConfigMap[plugin]
}

// Fallback组件
export function NotImplementedConfig({ plugin }: { plugin: string }) {
  return (
    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
      暂未实现插件 "{plugin}" 的配置表单，请联系研发补充。
    </div>
  )
}
