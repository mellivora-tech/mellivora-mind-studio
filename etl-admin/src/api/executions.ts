import { apiClient } from './client'
import type { 
  Execution, 
  ApiResponse, 
  PaginatedResponse 
} from '@/types/etl'

const BASE_PATH = '/etl/executions'

export const executionsApi = {
  // 获取执行列表
  list: async (params?: { 
    scheduleId?: string
    pipelineId?: string
    status?: string
    page?: number
    pageSize?: number 
  }) => {
    const response = await apiClient.get<PaginatedResponse<Execution>>(BASE_PATH, { params })
    return response.data
  },

  // 获取单个执行
  get: async (id: string) => {
    const response = await apiClient.get<ApiResponse<Execution>>(`${BASE_PATH}/${id}`)
    return response.data.data
  },

  // 取消执行
  cancel: async (id: string) => {
    const response = await apiClient.post<ApiResponse<Execution>>(`${BASE_PATH}/${id}/cancel`)
    return response.data.data
  },

  // 重试执行
  retry: async (id: string) => {
    const response = await apiClient.post<ApiResponse<{ executionId: string }>>(
      `${BASE_PATH}/${id}/retry`
    )
    return response.data.data
  },

  // 获取执行日志
  getLogs: async (id: string, params?: { taskId?: string; level?: string }) => {
    const response = await apiClient.get<ApiResponse<{ logs: string[] }>>(
      `${BASE_PATH}/${id}/logs`,
      { params }
    )
    return response.data.data.logs
  },

  // 获取执行指标
  getMetrics: async (id: string) => {
    const response = await apiClient.get<ApiResponse<Record<string, unknown>>>(
      `${BASE_PATH}/${id}/metrics`
    )
    return response.data.data
  },
}
