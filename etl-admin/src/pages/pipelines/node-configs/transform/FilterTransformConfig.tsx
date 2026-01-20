import { FilterBuilder } from '../shared'
import type { NodeConfigProps, FilterTransformConfig as FilterTransformConfigType, FieldInfo } from '../types'

const DEFAULT_FIELDS: FieldInfo[] = [
  { name: 'field1', type: 'string' },
  { name: 'field2', type: 'number' },
  { name: 'ts', type: 'datetime' },
]

export function FilterTransformConfig({ config, onChange }: NodeConfigProps<FilterTransformConfigType>) {
  const current: FilterTransformConfigType = {
    conditions: [],
    logic: 'and',
    ...config,
  }

  const fields = DEFAULT_FIELDS

  return (
    <FilterBuilder
      conditions={current.conditions}
      onChange={(conds) => onChange({ ...current, conditions: conds })}
      fields={fields}
      logic={current.logic}
      onLogicChange={(logic) => onChange({ ...current, logic })}
      label="过滤条件"
    />
  )
}
