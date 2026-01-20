# ETL Admin - Mellivora Mind Studio

ETL 配置管理界面，用于管理数据源、数据集、管道、调度和执行监控。

## 技术栈

- React 18 + TypeScript
- Vite
- TailwindCSS + shadcn/ui
- ReactFlow (管道设计器)
- TanStack Query (数据获取)
- React Hook Form + Zod (表单验证)

## 开发环境启动

### 1. 启动后端服务

**方式一：使用 Docker Compose（推荐）**

```bash
# 在项目根目录
cd mellivora-mind-studio

# 启动 PostgreSQL 和 ETL Config 服务
docker compose -f docker-compose.dev.yml up -d
```

**方式二：使用云数据库**

设置环境变量后启动：

```bash
export DB_HOST=your-rds-host
export DB_PORT=5432
export DB_USER=postgres
export DB_PASSWORD=your-password
export DB_NAME=mellivora
export DB_SSLMODE=require

# 初始化数据库
python scripts/init_etl_db.py

# 启动后端服务
cd services/etl-config
go run ./cmd/etl-config
```

### 2. 启动前端

```bash
cd etl-admin
npm install
npm run dev
```

访问 http://localhost:3001

## 功能模块

### 数据源管理 `/datasources`
- 配置数据源连接（Tushare、Wind、数据库等）
- 测试连接
- 管理数据能力

### 数据集管理 `/datasets`
- 定义数据 Schema
- 配置存储（PostgreSQL、ClickHouse、Redis）
- DDL 预览

### 管道设计器 `/pipelines`
- 拖拽式 ETL 流程设计
- 可视化节点连接
- 支持 Extract、Transform、Load 三类节点

### 调度管理 `/schedules`
- Cron 表达式配置
- DAG 依赖设计
- 启用/禁用调度

### 执行监控 `/executions`
- 实时执行状态
- 任务进度
- 日志查看

## API 代理

前端开发服务器会将 `/api/*` 请求代理到 `http://localhost:8080`。

## 构建

```bash
npm run build
```

构建产物在 `dist/` 目录。
