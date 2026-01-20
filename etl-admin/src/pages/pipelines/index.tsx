import { useState, useCallback, useRef, useMemo } from 'react'
import ReactFlow, {
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
  Handle,
  Position,
  MarkerType,
} from 'reactflow'
import type { Connection, Node } from 'reactflow'
import 'reactflow/dist/style.css'
import {
  Database,
  Settings,
  Play,
  Save,
  Trash2,
  FileText,
  Filter,
  GitMerge,
  Server,
  Code,
  ArrowRight,
  Wifi,
  Cloud,
  Upload,
  CloudUpload,
  ArrowRightLeft,
  Calculator,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'

import { Header } from '@/components/layout'
import {
  Button,
  Input,
  Label,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from '@/components/ui'
import type { PipelineStep } from '@/types/etl'
import { getConfigComponent, NotImplementedConfig } from './node-configs/index.js'

// --- Custom Node Component ---
const PipelineNode = ({ data, selected }: { data: any; selected: boolean }) => {
  const Icon = data.icon || Code
  
  // Color mapping based on type
  const getColors = (type: string) => {
    switch (type) {
      case 'extract': return 'border-green-500 bg-green-50'
      case 'transform': return 'border-blue-500 bg-blue-50'
      case 'load': return 'border-purple-500 bg-purple-50'
      default: return 'border-slate-500 bg-slate-50'
    }
  }

  return (
    <div
      className={`px-4 py-3 shadow-md rounded-md border-2 min-w-[150px] ${
        selected ? 'ring-2 ring-offset-1 ring-primary' : ''
      } ${getColors(data.type)}`}
    >
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-slate-400" />
      
      <div className="flex items-center">
        <div className="rounded-full p-1 bg-white/80 mr-2">
          <Icon className="h-4 w-4 text-slate-700" />
        </div>
        <div>
          <div className="text-sm font-bold text-slate-800">{data.label}</div>
          <div className="text-xs text-slate-500">{data.plugin}</div>
        </div>
      </div>

      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-slate-400" />
    </div>
  )
}

const nodeTypes = {
  pipelineNode: PipelineNode,
}

// --- Mock Data for Sidebar ---
const NODE_TEMPLATES = {
  extract: [
    { type: 'extract', plugin: 'source-postgres', label: 'PostgreSQL', icon: Database },
    { type: 'extract', plugin: 'source-clickhouse', label: 'ClickHouse', icon: Cloud },
    { type: 'extract', plugin: 'source-csv', label: 'CSV 文件', icon: FileText },
    { type: 'extract', plugin: 'source-api', label: 'API Source', icon: Wifi },
  ],
  transform: [
    { type: 'transform', plugin: 'transform-filter', label: 'Filter', icon: Filter },
    { type: 'transform', plugin: 'transform-map', label: 'Map Field', icon: ArrowRightLeft },
    { type: 'transform', plugin: 'transform-join', label: 'Join', icon: GitMerge },
    { type: 'transform', plugin: 'transform-aggregate', label: 'Aggregate', icon: Calculator },
    { type: 'transform', plugin: 'transform-dedupe', label: 'Deduplicate', icon: Trash2 },
  ],
  load: [
    { type: 'load', plugin: 'target-postgres', label: 'PostgreSQL', icon: Server },
    { type: 'load', plugin: 'target-clickhouse', label: 'ClickHouse', icon: CloudUpload },
    { type: 'load', plugin: 'target-csv', label: 'CSV 输出', icon: Upload },
  ],
}

// --- Sidebar Components ---
const SidebarItem = ({ item, colorTheme }: { item: any, colorTheme: 'green' | 'blue' | 'purple' }) => {
  const onDragStart = (event: React.DragEvent, nodeType: string, plugin: string, label: string) => {
    event.dataTransfer.setData('application/reactflow/type', nodeType)
    event.dataTransfer.setData('application/reactflow/plugin', plugin)
    event.dataTransfer.setData('application/reactflow/label', label)
    event.dataTransfer.effectAllowed = 'move'
  }

  const Icon = item.icon

  const themeStyles = {
    green: {
      bg: 'bg-green-50/40 hover:bg-green-50',
      border: 'border-green-100 hover:border-green-200',
      icon: 'text-green-600',
      iconBg: 'bg-green-100/80'
    },
    blue: {
      bg: 'bg-blue-50/40 hover:bg-blue-50',
      border: 'border-blue-100 hover:border-blue-200',
      icon: 'text-blue-600',
      iconBg: 'bg-blue-100/80'
    },
    purple: {
      bg: 'bg-purple-50/40 hover:bg-purple-50',
      border: 'border-purple-100 hover:border-purple-200',
      icon: 'text-purple-600',
      iconBg: 'bg-purple-100/80'
    }
  }

  const theme = themeStyles[colorTheme]

  return (
    <div
      className={`flex flex-col items-center justify-center p-3 border rounded-xl cursor-grab transition-all duration-200 hover:scale-105 hover:shadow-md ${theme.bg} ${theme.border}`}
      onDragStart={(event) => onDragStart(event, item.type, item.plugin, item.label)}
      draggable
    >
      <div className={`mb-2 p-2.5 rounded-lg ${theme.iconBg} shadow-sm`}>
        <Icon className={`w-6 h-6 ${theme.icon}`} />
      </div>
      <span className="text-xs font-semibold text-slate-700 text-center leading-tight tracking-tight">{item.label}</span>
    </div>
  )
}

const SidebarGroup = ({ 
  title, 
  items, 
  colorTheme, 
  defaultExpanded = true 
}: { 
  title: string
  items: any[]
  colorTheme: 'green' | 'blue' | 'purple'
  defaultExpanded?: boolean 
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  
  const borderColor = {
    green: 'bg-green-500',
    blue: 'bg-blue-500',
    purple: 'bg-purple-500'
  }[colorTheme]

  return (
    <div className="mb-2">
      <div 
        className="flex items-center justify-between px-4 py-3 cursor-pointer group select-none hover:bg-slate-50/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center">
          <div className={`w-1 h-4 rounded-full mr-2.5 ${borderColor}`} />
          <span className="font-bold text-sm text-slate-700 group-hover:text-slate-900">{title}</span>
        </div>
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
        ) : (
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
        )}
      </div>
      
      {isExpanded && (
        <div className="grid grid-cols-2 gap-3 px-4 pb-2 animate-in slide-in-from-top-1 duration-200">
          {items.map((item) => (
            <SidebarItem key={item.plugin} item={item} colorTheme={colorTheme} />
          ))}
        </div>
      )}
    </div>
  )
}

// --- Node Configuration Panel ---
interface NodeConfigPanelProps {
  node: Node
  onUpdate: (data: any) => void
  onDelete: () => void
  onClose: () => void
}

const NodeConfigPanel = ({ node, onUpdate, onDelete, onClose }: NodeConfigPanelProps) => {
  const plugin = node.data.plugin as string
  const mapping = getConfigComponent(plugin)
  const ConfigComponent = mapping?.Component
  const nodeType = (mapping?.type || node.data.type) as 'extract' | 'transform' | 'load'

  const colors = (() => {
    switch (nodeType) {
      case 'extract':
        return { bg: 'bg-green-50', badge: 'bg-green-100 text-green-800', text: 'text-green-700' }
      case 'transform':
        return { bg: 'bg-blue-50', badge: 'bg-blue-100 text-blue-800', text: 'text-blue-700' }
      case 'load':
        return { bg: 'bg-purple-50', badge: 'bg-purple-100 text-purple-800', text: 'text-purple-700' }
      default:
        return { bg: 'bg-slate-50', badge: 'bg-slate-100 text-slate-800', text: 'text-slate-700' }
    }
  })()

  const typeLabels = { extract: '数据源', transform: '转换器', load: '目标' }

  return (
    <div className="w-[340px] border-l bg-background overflow-y-auto shadow-xl z-10 flex flex-col">
      {/* Header */}
      <div className={`p-4 border-b ${colors.bg}`}>
        <div className="flex items-center justify-between mb-2">
          <span className={`text-xs font-medium px-2 py-0.5 rounded ${colors.badge}`}>
            {typeLabels[nodeType] || '节点'}
          </span>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
        <Input
          value={node.data.label}
          onChange={(e) => onUpdate({ label: e.target.value })}
          className="font-semibold text-lg border-0 bg-transparent px-0 h-auto focus-visible:ring-0"
        />
        <div className="text-xs text-muted-foreground mt-1">{plugin}</div>
      </div>

      <div className="flex-1 p-4 space-y-4">
        {ConfigComponent ? (
          <ConfigComponent
            config={node.data.config || {}}
            onChange={(cfg: any) => onUpdate({ config: cfg })}
            nodeId={node.id}
          />
        ) : (
          <NotImplementedConfig plugin={plugin} />
        )}

        <div className="h-px bg-border" />

        <div className="space-y-3">
          <Label className="text-sm font-medium text-muted-foreground">高级设置</Label>
          <div className="flex items-center justify-between">
            <Label className="text-sm">并行执行</Label>
            <Switch
              checked={node.data.config?.parallel || false}
              onCheckedChange={(checked) => onUpdate({ config: { ...node.data.config, parallel: checked } })}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm">错误处理</Label>
            <Select
              value={node.data.config?.onError || 'fail'}
              onValueChange={(value) => onUpdate({ config: { ...node.data.config, onError: value } })}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fail">失败停止</SelectItem>
                <SelectItem value="skip_row">跳过错误行</SelectItem>
                <SelectItem value="default_value">使用默认值</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="p-4 border-t mt-auto">
        <Button variant="destructive" className="w-full" onClick={onDelete}>
          <Trash2 className="w-4 h-4 mr-2" />
          删除节点
        </Button>
      </div>
    </div>
  )
}

// --- Main Component ---
const PipelineDesigner = () => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId: string } | null>(null)
  const [pipelineName, setPipelineName] = useState('New Pipeline')
  const [showSettings, setShowSettings] = useState(false)

  // Selected node object
  const selectedNode = useMemo(() => {
    return nodes.find((n) => n.id === selectedNodeId)
  }, [nodes, selectedNodeId])

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, markerEnd: { type: MarkerType.ArrowClosed } }, eds)),
    [setEdges]
  )

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()

      if (!reactFlowWrapper.current || !reactFlowInstance) return

      const type = event.dataTransfer.getData('application/reactflow/type')
      const plugin = event.dataTransfer.getData('application/reactflow/plugin')
      const label = event.dataTransfer.getData('application/reactflow/label')

      if (typeof type === 'undefined' || !type) return

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })

      const newNode: Node = {
        id: `${type}-${Date.now()}`,
        type: 'pipelineNode',
        position,
        data: { 
          label: label, 
          type: type, // extract, transform, load
          plugin: plugin,
          config: {},
          icon: getIconForPlugin(plugin)
        },
      }

      setNodes((nds) => nds.concat(newNode))
    },
    [reactFlowInstance, setNodes]
  )

  const getIconForPlugin = (plugin: string) => {
    // Helper to find icon component again (since we can't pass component class through drag data easily)
    for (const group of Object.values(NODE_TEMPLATES)) {
      const found = group.find(item => item.plugin === plugin)
      if (found) return found.icon
    }
    return Code
  }

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id)
    setContextMenu(null)
  }, [])

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null)
    setContextMenu(null)
  }, [])

  const onNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
    event.preventDefault()
    setSelectedNodeId(node.id)
    setContextMenu({ x: event.clientX, y: event.clientY, nodeId: node.id })
  }, [])

  const updateNodeData = (id: string, newData: any) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          return { ...node, data: { ...node.data, ...newData } }
        }
        return node
      })
    )
  }

  const deleteSelectedNode = (targetId?: string) => {
    const id = targetId || selectedNodeId
    if (id) {
      setNodes((nds) => nds.filter((n) => n.id !== id))
      setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id))
      if (selectedNodeId === id) setSelectedNodeId(null)
      setContextMenu(null)
    }
  }

  const duplicateNode = (nodeId: string) => {
    const target = nodes.find((n) => n.id === nodeId)
    if (!target) return
    const newNode: Node = {
      ...target,
      id: `${target.data.type}-${Date.now()}`,
      position: { x: target.position.x + 30, y: target.position.y + 30 },
      selected: false,
    }
    setNodes((nds) => nds.concat(newNode))
    setContextMenu(null)
  }

  const handleSave = async () => {
    const steps: PipelineStep[] = nodes.map(node => ({
      id: node.id,
      name: node.data.label,
      type: node.data.type as any,
      plugin: node.data.plugin,
      config: {
        ...node.data.config,
        ui: { position: node.position }
      },
      // Logic to determine input/output would depend on edges
      // simplified for now
    }))
    
    // In a real app, we would map edges to determine dependency flow
    // and construct the Pipeline object
    
    console.log('Saving pipeline:', { name: pipelineName, steps, edges })
    // await pipelinesApi.create({ name: pipelineName, steps })
  }



  return (
    <div className="flex flex-col h-full">
      <Header 
        title={pipelineName}
        actions={
          <div className="flex items-center space-x-2">
            <Button size="sm" variant="outline" onClick={() => setShowSettings(true)}>
              <Settings className="w-4 h-4 mr-2" />
              设置
            </Button>
            <Button size="sm" variant="outline" onClick={() => console.log('Run')}>
              <Play className="w-4 h-4 mr-2" />
              运行
            </Button>
            <Button size="sm" onClick={handleSave}>
              <Save className="w-4 h-4 mr-2" />
              保存
            </Button>
          </div>
        }
      />
      
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-[250px] border-r bg-background flex flex-col">
          <div className="p-4 border-b">
            <h2 className="text-sm font-semibold mb-1">组件库</h2>
            <p className="text-xs text-muted-foreground">拖拽组件到画布</p>
          </div>
          
          <div className="flex-1 w-full overflow-y-auto py-2 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
            <SidebarGroup 
              title="数据源 (Extract)" 
              items={NODE_TEMPLATES.extract} 
              colorTheme="green" 
            />
            <SidebarGroup 
              title="转换器 (Transform)" 
              items={NODE_TEMPLATES.transform} 
              colorTheme="blue" 
            />
            <SidebarGroup 
              title="目标 (Load)" 
              items={NODE_TEMPLATES.load} 
              colorTheme="purple" 
            />
          </div>
        </div>

        {/* Main Canvas */}
        <div className="flex-1 h-full relative" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            onNodeContextMenu={onNodeContextMenu}
            nodeTypes={nodeTypes}
            fitView
          >
            <Background color="#aaa" gap={16} size={1} />
            <Controls />
            <MiniMap 
              nodeColor={(node) => {
                const type = node.data.type
                if (type === 'extract') return '#bbf7d0' // green-200
                if (type === 'transform') return '#bfdbfe' // blue-200
                if (type === 'load') return '#e9d5ff' // purple-200
                return '#e2e8f0'
              }}
            />
          </ReactFlow>

          {/* 右键菜单 */}
          {contextMenu && (
            <div className="fixed inset-0 z-40" onClick={() => setContextMenu(null)}>
              <div
                className="absolute bg-white border rounded-md shadow-lg text-sm py-1 min-w-[160px]"
                style={{ top: contextMenu.y, left: contextMenu.x }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  className="w-full text-left px-3 py-2 hover:bg-muted"
                  onClick={() => {
                    setSelectedNodeId(contextMenu.nodeId)
                    setContextMenu(null)
                  }}
                >
                  编辑配置
                </button>
                <button
                  className="w-full text-left px-3 py-2 hover:bg-muted"
                  onClick={() => duplicateNode(contextMenu.nodeId)}
                >
                  复制节点
                </button>
                <button
                  className="w-full text-left px-3 py-2 hover:bg-red-50 text-red-600"
                  onClick={() => deleteSelectedNode(contextMenu.nodeId)}
                >
                  删除节点
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar - Properties */}
        {selectedNode && (
          <NodeConfigPanel
            node={selectedNode}
            onUpdate={(newData) => updateNodeData(selectedNode.id, newData)}
            onDelete={deleteSelectedNode}
            onClose={() => setSelectedNodeId(null)}
          />
        )}
      </div>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>管道设置</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="pipeline-name">名称</Label>
              <Input 
                id="pipeline-name" 
                value={pipelineName} 
                onChange={(e) => setPipelineName(e.target.value)} 
              />
            </div>
            {/* Additional settings like description, schedule, etc. */}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function PipelineDesignerPage() {
  return (
    <ReactFlowProvider>
      <PipelineDesigner />
    </ReactFlowProvider>
  )
}
