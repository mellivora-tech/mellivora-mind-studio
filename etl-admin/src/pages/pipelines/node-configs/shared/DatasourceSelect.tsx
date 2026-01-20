import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, AlertCircle, Database, Plus, Zap } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Button,
  Label,
} from '@/components/ui'
import { datasourcesApi } from '@/api'
import type { DataSource } from '@/types/etl'

interface DatasourceSelectProps {
  value?: string
  onChange: (datasourceId: string, datasource?: DataSource) => void
  pluginFilter?: string[] // 只显示特定插件的数据源
  label?: string
  placeholder?: string
  showStatus?: boolean
  showDetails?: boolean
  onCreateNew?: () => void
  onTest?: (datasource: DataSource) => void
}

export function DatasourceSelect({
  value,
  onChange,
  pluginFilter,
  label = '数据源',
  placeholder = '选择数据源...',
  showStatus = true,
  showDetails = true,
  onCreateNew,
  onTest,
}: DatasourceSelectProps) {
  const { data: response, isLoading } = useQuery({
    queryKey: ['datasources'],
    queryFn: () => datasourcesApi.list({ pageSize: 100 }),
  })

  const datasources = response?.data || []
  
  // 根据插件过滤
  const filteredDatasources = pluginFilter
    ? datasources.filter(ds => pluginFilter.includes(ds.plugin))
    : datasources

  const selectedDatasource = datasources.find(ds => ds.id === value)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{label}</Label>
        {showStatus && selectedDatasource && (
          <span className={`text-xs px-1.5 py-0.5 rounded ${
            selectedDatasource.status === 'active' 
              ? 'bg-green-100 text-green-700' 
              : 'bg-yellow-100 text-yellow-700'
          }`}>
            {selectedDatasource.status === 'active' ? '已连接' : '未连接'}
          </span>
        )}
      </div>
      
      <div className="flex gap-2">
        <Select
          value={value || ''}
          onValueChange={(val) => {
            const ds = datasources.find(d => d.id === val)
            onChange(val, ds)
          }}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder={isLoading ? '加载中...' : placeholder} />
          </SelectTrigger>
          <SelectContent>
            {filteredDatasources.length === 0 ? (
              <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                暂无可用数据源
                <br />
                <span className="text-xs">请先在数据源管理中创建</span>
              </div>
            ) : (
              filteredDatasources.map((ds) => (
                <SelectItem key={ds.id} value={ds.id}>
                  <div className="flex items-center gap-2">
                    {ds.status === 'active' ? (
                      <CheckCircle2 className="w-3 h-3 text-green-500 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-3 h-3 text-yellow-500 flex-shrink-0" />
                    )}
                    <span className="truncate">{ds.name}</span>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      ({ds.plugin})
                    </span>
                  </div>
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        
        {onCreateNew && (
          <Button variant="outline" size="icon" onClick={onCreateNew} title="新建数据源">
            <Plus className="w-4 h-4" />
          </Button>
        )}
        
        {onTest && selectedDatasource && (
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => onTest(selectedDatasource)}
            title="测试连接"
          >
            <Zap className="w-4 h-4" />
          </Button>
        )}
      </div>

      {showDetails && selectedDatasource && (
        <div className="p-3 rounded-lg bg-muted/50 border">
          <div className="flex items-center gap-2 mb-2">
            <Database className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium text-sm">{selectedDatasource.name}</span>
          </div>
          <div className="text-xs text-muted-foreground space-y-1">
            <div className="flex justify-between">
              <span>插件:</span>
              <span className="font-mono">{selectedDatasource.plugin}</span>
            </div>
            <div className="flex justify-between">
              <span>类型:</span>
              <span>{selectedDatasource.type}</span>
            </div>
            {selectedDatasource.description && (
              <div className="mt-2 pt-2 border-t text-muted-foreground">
                {selectedDatasource.description}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
