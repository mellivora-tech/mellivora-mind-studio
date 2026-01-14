# 数据库设计

## 用户与权限

### users - 用户表

| 字段 | 类型 | 说明 |
|-----|------|------|
| id | UUID | 主键 |
| email | VARCHAR | 邮箱 |
| password_hash | VARCHAR | 密码哈希 |
| role | ENUM | LP/MANAGER/RESEARCHER/ADMIN |
| name | VARCHAR | 姓名 |
| phone | VARCHAR | 手机号 |
| avatar | VARCHAR | 头像 URL |
| tenant_id | UUID | 租户 ID |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

### tenants - 租户表

| 字段 | 类型 | 说明 |
|-----|------|------|
| id | UUID | 主键 |
| name | VARCHAR | 租户名称 |
| license_key | VARCHAR | License |
| api_endpoint | VARCHAR | 私有化 API 地址 |
| plan | ENUM | FREE/PAID |
| created_at | TIMESTAMP | 创建时间 |

---

## 基金相关

### funds - 基金表

| 字段 | 类型 | 说明 |
|-----|------|------|
| id | UUID | 主键 |
| code | VARCHAR | 基金代码 |
| name | VARCHAR | 基金名称 |
| type | ENUM | 股票/债券/混合/CTA 等 |
| manager_id | UUID | 基金经理 ID |
| tenant_id | UUID | 租户 ID |
| inception_date | DATE | 成立日期 |
| status | ENUM | ACTIVE/CLOSED |
| created_at | TIMESTAMP | 创建时间 |

### fund_navs - 基金净值表

| 字段 | 类型 | 说明 |
|-----|------|------|
| id | UUID | 主键 |
| fund_id | UUID | 基金 ID |
| nav_date | DATE | 净值日期 |
| nav | DECIMAL | 单位净值 |
| cumulative_nav | DECIMAL | 累计净值 |
| daily_return | DECIMAL | 日收益率 |
| created_at | TIMESTAMP | 创建时间 |

### holdings - LP 持仓表

| 字段 | 类型 | 说明 |
|-----|------|------|
| id | UUID | 主键 |
| user_id | UUID | LP 用户 ID |
| fund_id | UUID | 基金 ID |
| shares | DECIMAL | 持有份额 |
| cost | DECIMAL | 成本 |
| created_at | TIMESTAMP | 创建时间 |

---

## 报告相关

### report_templates - 报告模板表

| 字段 | 类型 | 说明 |
|-----|------|------|
| id | UUID | 主键 |
| name | VARCHAR | 模板名称 |
| content | JSONB | 模板内容 (拖拽组件配置) |
| tenant_id | UUID | 租户 ID |
| created_by | UUID | 创建人 |
| created_at | TIMESTAMP | 创建时间 |

### reports - 报告表

| 字段 | 类型 | 说明 |
|-----|------|------|
| id | UUID | 主键 |
| template_id | UUID | 模板 ID |
| fund_id | UUID | 基金 ID |
| report_date | DATE | 报告日期 |
| content | JSONB | 报告内容 |
| file_url | VARCHAR | PDF 文件地址 |
| status | ENUM | DRAFT/PUBLISHED |
| created_by | UUID | 创建人 |
| created_at | TIMESTAMP | 创建时间 |

---

## AI 相关

### conversations - 对话表

| 字段 | 类型 | 说明 |
|-----|------|------|
| id | UUID | 主键 |
| user_id | UUID | 用户 ID |
| title | VARCHAR | 对话标题 |
| mode | ENUM | GENERAL/RESEARCH |
| target_symbol | VARCHAR | 研究标的（可选） |
| created_at | TIMESTAMP | 创建时间 |

### messages - 消息表

| 字段 | 类型 | 说明 |
|-----|------|------|
| id | UUID | 主键 |
| conversation_id | UUID | 对话 ID |
| role | ENUM | USER/ASSISTANT |
| content | TEXT | 消息内容 |
| created_at | TIMESTAMP | 创建时间 |

## 交易相关（私有化部署）

> 以下表存储在客户私有化数据库中

### trading_lists - 交易意图单

| 字段 | 类型 | 说明 |
|-----|------|------|
| id | UUID | 主键 |
| fund_id | UUID | 基金 ID |
| trade_date | DATE | 交易日期 |
| symbol | VARCHAR | 标的代码 |
| direction | ENUM | BUY/SELL |
| target_qty | DECIMAL | 目标数量 |
| target_price | DECIMAL | 目标价格 |
| status | ENUM | PENDING/EXECUTING/DONE |
| created_at | TIMESTAMP | 创建时间 |

### orders - 订单表

| 字段 | 类型 | 说明 |
|-----|------|------|
| id | UUID | 主键 |
| trading_list_id | UUID | 意图单 ID |
| fund_id | UUID | 基金 ID |
| symbol | VARCHAR | 标的代码 |
| direction | ENUM | BUY/SELL |
| order_qty | DECIMAL | 委托数量 |
| order_price | DECIMAL | 委托价格 |
| order_type | ENUM | LIMIT/MARKET |
| status | ENUM | PENDING/FILLED/CANCELLED |
| order_time | TIMESTAMP | 委托时间 |

### deals - 成交表

| 字段 | 类型 | 说明 |
|-----|------|------|
| id | UUID | 主键 |
| order_id | UUID | 订单 ID |
| fund_id | UUID | 基金 ID |
| symbol | VARCHAR | 标的代码 |
| direction | ENUM | BUY/SELL |
| deal_qty | DECIMAL | 成交数量 |
| deal_price | DECIMAL | 成交价格 |
| deal_amount | DECIMAL | 成交金额 |
| commission | DECIMAL | 佣金 |
| deal_time | TIMESTAMP | 成交时间 |

### positions - 持仓表

| 字段 | 类型 | 说明 |
|-----|------|------|
| id | UUID | 主键 |
| fund_id | UUID | 基金 ID |
| symbol | VARCHAR | 标的代码 |
| qty | DECIMAL | 持仓数量 |
| avg_cost | DECIMAL | 平均成本 |
| market_value | DECIMAL | 市值 |
| pnl | DECIMAL | 盈亏 |
| update_date | DATE | 更新日期 |

### accounts - 账户表

| 字段 | 类型 | 说明 |
|-----|------|------|
| id | UUID | 主键 |
| fund_id | UUID | 基金 ID |
| cash | DECIMAL | 现金 |
| total_assets | DECIMAL | 总资产 |
| available | DECIMAL | 可用资金 |
| frozen | DECIMAL | 冻结资金 |
| update_date | DATE | 更新日期 |

---

## 行情相关

### quotes - 行情表

| 字段 | 类型 | 说明 |
|-----|------|------|
| id | UUID | 主键 |
| symbol | VARCHAR | 标的代码 |
| trade_date | DATE | 交易日期 |
| open | DECIMAL | 开盘价 |
| high | DECIMAL | 最高价 |
| low | DECIMAL | 最低价 |
| close | DECIMAL | 收盘价 |
| volume | BIGINT | 成交量 |
| amount | DECIMAL | 成交额 |

---

## 待确认

- [ ] 舆情/新闻表（外部数据源缓存）
- [ ] 更多字段需求

