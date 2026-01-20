import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import {
  Database,
  Table2,
  GitBranch,
  Calendar,
  Activity,
  Settings,
  Home,
} from 'lucide-react'

const navigation = [
  { name: '概览', href: '/', icon: Home },
  { name: '数据源', href: '/datasources', icon: Database },
  { name: '数据集', href: '/datasets', icon: Table2 },
  { name: '管道', href: '/pipelines', icon: GitBranch },
  { name: '调度', href: '/schedules', icon: Calendar },
  { name: '执行', href: '/executions', icon: Activity },
  { name: '设置', href: '/settings', icon: Settings },
]

export function Sidebar() {
  const location = useLocation()

  return (
    <div className="flex h-full w-64 flex-col border-r bg-card">
      {/* Logo */}
      <div className="flex h-16 items-center border-b px-6">
        <Link to="/" className="flex items-center space-x-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-lg font-bold text-primary-foreground">M</span>
          </div>
          <span className="text-lg font-semibold">ETL 配置中心</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href || 
            (item.href !== '/' && location.pathname.startsWith(item.href))
          
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                'flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.name}</span>
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t p-4">
        <div className="text-xs text-muted-foreground">
          <p>Mellivora Mind Studio</p>
          <p>ETL 配置管理 v1.0.0</p>
        </div>
      </div>
    </div>
  )
}
