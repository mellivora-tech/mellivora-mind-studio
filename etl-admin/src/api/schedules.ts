import { apiClient } from './client'
import type { 
  Schedule, 
  ApiResponse, 
  PaginatedResponse 
} from '@/types/etl'

const BASE_PATH = '/etl/schedules'

export const schedulesApi = {
  // 获取调度列表
  list: async (params?: { 
    enabled?: boolean
    page?: number
    pageSize?: number 
  }) => {
    const response = await apiClient.get<PaginatedResponse<Schedule>>(BASE_PATH, { params })
    return response.data
  },

  // 获取单个调度
  get: async (id: string) => {
    const response = await apiClient.get<ApiResponse<Schedule>>(`${BASE_PATH}/${id}`)
    return response.data.data
  },

  // 创建调度
  create: async (data: Partial<Schedule>) => {
    const response = await apiClient.post<ApiResponse<Schedule>>(BASE_PATH, data)
    return response.data.data
  },

  // 更新调度
  update: async (id: string, data: Partial<Schedule>) => {
    const response = await apiClient.put<ApiResponse<Schedule>>(`${BASE_PATH}/${id}`, data)
    return response.data.data
  },

  // 删除调度
  delete: async (id: string) => {
    await apiClient.delete(`${BASE_PATH}/${id}`)
  },

  // 启用调度
  enable: async (id: string) => {
    const response = await apiClient.post<ApiResponse<Schedule>>(`${BASE_PATH}/${id}/enable`)
    return response.data.data
  },

  // 禁用调度
  disable: async (id: string) => {
    const response = await apiClient.post<ApiResponse<Schedule>>(`${BASE_PATH}/${id}/disable`)
    return response.data.data
  },

  // 立即触发
  trigger: async (id: string, params?: Record<string, unknown>) => {
    const response = await apiClient.post<ApiResponse<{ executionId: string }>>(
      `${BASE_PATH}/${id}/trigger`,
      { params }
    )
    return response.data.data
  },
}
