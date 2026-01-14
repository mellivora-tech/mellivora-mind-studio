# Mellivora Mind Studio

私募基金投研报告系统

## 项目结构

```
mellivora-mind-studio/
├── apps/
│   ├── mms-web-client/      # C 端 Web (SolidJS)
│   ├── mms-web-admin/       # 管理后台 (React + shadcn/ui)
│   ├── mms-mobile/          # React Native APP
│   └── mms-miniprogram/     # 微信小程序
│
├── packages/
│   ├── mms-api-gateway/     # API 网关 (Hono)
│   ├── mms-agent-service/   # AI Agent (VoltAgent)
│   ├── mms-api-service/     # 业务 API (Hono)
│   └── mms-shared/          # 共享类型/工具
```

## 开发

```bash
# 安装依赖
bun install

# 启动所有服务
bun run dev

# 启动单个服务
bun run dev --filter=mms-api-gateway
```

## 技术栈

- **运行时**: Bun
- **构建**: Turborepo
- **前端**: SolidJS / React + shadcn/ui
- **后端**: Hono + VoltAgent
- **数据库**: Neon (PostgreSQL)
- **缓存**: Upstash (Redis)
