import { Agent, createTool } from '@voltagent/core'
import { z } from 'zod'

// Tools
const searchFundTool = createTool({
  name: 'search_fund',
  description: '搜索基金信息',
  parameters: z.object({
    keyword: z.string().describe('基金名称或代码'),
  }),
  execute: async ({ keyword }) => {
    // TODO: 调用业务 API
    return { funds: [], message: `搜索: ${keyword}` }
  },
})

const getFundDetailTool = createTool({
  name: 'get_fund_detail',
  description: '获取基金详细信息',
  parameters: z.object({
    fundId: z.string().describe('基金 ID'),
  }),
  execute: async ({ fundId }) => {
    // TODO: 调用业务 API
    return { fund: null, message: `获取基金: ${fundId}` }
  },
})

// Research Agent Factory
export const createResearchAgent = (model: any) => new Agent({
  name: 'research',
  description: '投研分析助手，帮助用户分析基金和市场',
  instructions: `你是一位专业的投研分析师，帮助用户：
1. 查询基金信息
2. 分析基金表现
3. 回答投资相关问题

当用户选择具体标的时，自动获取相关数据并生成摘要。`,
  model,
  tools: [searchFundTool, getFundDetailTool],
})
