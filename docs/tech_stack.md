# Mellivora Mind Studio - 技术栈

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
│
├── docker-compose.yml
├── package.json             # Monorepo 根配置
└── turbo.json               # Turborepo 配置
```

---

## 技术栈详情

### 前端

| 服务 | 技术 | 版本 |
|-----|------|------|
| C 端 Web | SolidJS + Vite | 1.8+ |
| 管理后台 | React + shadcn/ui | React 18 |
| APP | React Native + Expo | SDK 50 |
| 小程序 | 原生微信小程序 | - |
| 状态管理 | TanStack Query | v5 |
| 样式 | TailwindCSS | v3 |

### 后端

| 服务 | 技术 | 说明 |
|-----|------|------|
| 运行时 | Bun | v1.0+ |
| API 网关 | Hono | 统一入口 |
| Agent | VoltAgent | AI 对话 |
| ORM | Drizzle ORM | 类型安全 |
| 验证 | Zod | Schema 验证 |

### 基础设施

| 服务 | 技术 | 免费额度 |
|-----|------|---------|
| 数据库 | Neon (PostgreSQL) | 0.5 GB |
| 缓存 | Upstash (Redis) | 10K/天 |
| 文件存储 | Cloudflare R2 | 10 GB |
| 向量库 | Turbopuffer / Upstash Vector | 按需 |

### 部署

| 服务 | 平台 |
|-----|------|
| 前端 | Vercel |
| 后端 | Railway |
| 数据库 | Neon |
| 缓存 | Upstash |

---

## Monorepo 工具

| 工具 | 用途 |
|-----|------|
| Turborepo | 构建编排 |
| Bun | 运行时 + 包管理 |
| TypeScript | 类型 |
| Biome | Lint + Format |

---

## 开发工具

| 工具 | 用途 |
|-----|------|
| VoltOps Console | Agent 调试 |
| Drizzle Studio | 数据库管理 |
| Bruno / Insomnia | API 测试 |
