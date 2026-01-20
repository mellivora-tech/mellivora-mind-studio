import { useQuery } from '@tanstack/react-query'
import { Database, Table2, GitBranch, Calendar, Activity, CheckCircle, XCircle, Clock } from 'lucide-react'
import { Header } from '@/components/layout'
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@/components/ui'
import { Link } from 'react-router-dom'
import { datasourcesApi, datasetsApi, pipelinesApi, schedulesApi, executionsApi } from '@/api'

interface StatCardProps {
  title: string
  value: number | string
  icon: React.ElementType
  href: string
  description?: string
}

function StatCard({ title, value, icon: Icon, href, description }: StatCardProps) {
  return (
    <Link to={href}>
      <Card className="hover:border-primary/50 transition-colors">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{value}</div>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}

export default function Dashboard() {
  // 获取各模块统计数据
  const { data: datasources } = useQuery({
    queryKey: ['datasources'],
    queryFn: () => datasourcesApi.list({ pageSize: 1 }),
  })

  const { data: datasets } = useQuery({
    queryKey: ['datasets'],
    queryFn: () => datasetsApi.list({ pageSize: 1 }),
  })

  const { data: pipelines } = useQuery({
    queryKey: ['pipelines'],
    queryFn: () => pipelinesApi.list({ pageSize: 1 }),
  })

  const { data: schedules } = useQuery({
    queryKey: ['schedules'],
    queryFn: () => schedulesApi.list({ pageSize: 1 }),
  })

  const { data: executions } = useQuery({
    queryKey: ['executions'],
    queryFn: () => executionsApi.list({ pageSize: 10 }),
  })

  const recentExecutions = executions?.data || []
  const successCount = recentExecutions.filter(e => e.status === 'success').length
  const failedCount = recentExecutions.filter(e => e.status === 'failed').length

  return (
    <div className="flex flex-col h-full">
      <Header title="概览" />
      
      <div className="flex-1 p-6 space-y-6">
        {/* 统计卡片 */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <StatCard
            title="数据源"
            value={datasources?.total || 0}
            icon={Database}
            href="/datasources"
            description="已配置的数据源"
          />
          <StatCard
            title="数据集"
            value={datasets?.total || 0}
            icon={Table2}
            href="/datasets"
            description="Schema 定义"
          />
          <StatCard
            title="管道"
            value={pipelines?.total || 0}
            icon={GitBranch}
            href="/pipelines"
            description="ETL 管道"
          />
          <StatCard
            title="调度"
            value={schedules?.total || 0}
            icon={Calendar}
            href="/schedules"
            description="定时任务"
          />
          <StatCard
            title="今日执行"
            value={recentExecutions.length}
            icon={Activity}
            href="/executions"
            description={`成功 ${successCount} / 失败 ${failedCount}`}
          />
        </div>

        {/* 最近执行 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">最近执行</CardTitle>
          </CardHeader>
          <CardContent>
            {recentExecutions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                暂无执行记录
              </div>
            ) : (
              <div className="space-y-4">
                {recentExecutions.slice(0, 5).map((execution) => (
                  <div
                    key={execution.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex items-center space-x-3">
                      {execution.status === 'success' && (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      )}
                      {execution.status === 'failed' && (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                      {execution.status === 'running' && (
                        <Clock className="h-5 w-5 text-blue-500 animate-pulse" />
                      )}
                      {execution.status === 'pending' && (
                        <Clock className="h-5 w-5 text-muted-foreground" />
                      )}
                      <div>
                        <div className="font-medium">
                          {execution.scheduleName || execution.pipelineName || execution.id}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {execution.startedAt
                            ? new Date(execution.startedAt).toLocaleString('zh-CN')
                            : '-'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <Badge
                        variant={
                          execution.status === 'success' ? 'success' :
                          execution.status === 'failed' ? 'destructive' :
                          execution.status === 'running' ? 'default' : 'secondary'
                        }
                      >
                        {execution.status === 'success' ? '成功' :
                         execution.status === 'failed' ? '失败' :
                         execution.status === 'running' ? '运行中' :
                         execution.status === 'pending' ? '等待' : execution.status}
                      </Badge>
                      {execution.duration && (
                        <span className="text-sm text-muted-foreground">
                          {Math.round(execution.duration / 1000)}s
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 快速操作 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">快速开始</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <Link
                to="/datasources"
                className="flex items-center p-4 rounded-lg border hover:border-primary/50 transition-colors"
              >
                <Database className="h-8 w-8 mr-4 text-primary" />
                <div>
                  <div className="font-medium">添加数据源</div>
                  <div className="text-sm text-muted-foreground">
                    配置 Tushare、Wind 等数据接口
                  </div>
                </div>
              </Link>
              <Link
                to="/datasets"
                className="flex items-center p-4 rounded-lg border hover:border-primary/50 transition-colors"
              >
                <Table2 className="h-8 w-8 mr-4 text-primary" />
                <div>
                  <div className="font-medium">定义数据集</div>
                  <div className="text-sm text-muted-foreground">
                    创建 Schema 和存储配置
                  </div>
                </div>
              </Link>
              <Link
                to="/pipelines"
                className="flex items-center p-4 rounded-lg border hover:border-primary/50 transition-colors"
              >
                <GitBranch className="h-8 w-8 mr-4 text-primary" />
                <div>
                  <div className="font-medium">设计管道</div>
                  <div className="text-sm text-muted-foreground">
                    拖拽式创建 ETL 流程
                  </div>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
