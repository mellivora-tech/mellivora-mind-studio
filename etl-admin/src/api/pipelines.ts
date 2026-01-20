import { apiClient } from './client'
import type { 
  Pipeline, 
  ApiResponse, 
  PaginatedResponse,
  Plugin 
} from '@/types/etl'

const BASE_PATH = '/etl/pipelines'

export const pipelinesApi = {
  // 获取管道列表
  list: async (params?: { 
    status?: string
    page?: number
    pageSize?: number 
  }) => {
    const response = await apiClient.get<PaginatedResponse<Pipeline>>(BASE_PATH, { params })
    return response.data
  },

  // 获取单个管道
  get: async (id: string) => {
    const response = await apiClient.get<ApiResponse<Pipeline>>(`${BASE_PATH}/${id}`)
    return response.data.data
  },

  // 创建管道
  create: async (data: Partial<Pipeline>) => {
    const response = await apiClient.post<ApiResponse<Pipeline>>(BASE_PATH, data)
    return response.data.data
  },

  // 更新管道
  update: async (id: string, data: Partial<Pipeline>) => {
    const response = await apiClient.put<ApiResponse<Pipeline>>(`${BASE_PATH}/${id}`, data)
    return response.data.data
  },

  // 删除管道
  delete: async (id: string) => {
    await apiClient.delete(`${BASE_PATH}/${id}`)
  },

  // 验证管道
  validate: async (id: string) => {
    const response = await apiClient.post<ApiResponse<{ valid: boolean; errors?: string[] }>>(
      `${BASE_PATH}/${id}/validate`
    )
    return response.data.data
  },

  // 运行管道
  run: async (id: string, params?: Record<string, unknown>) => {
    const response = await apiClient.post<ApiResponse<{ executionId: string }>>(
      `${BASE_PATH}/${id}/run`,
      { params }
    )
    return response.data.data
  },

  // 获取转换插件列表
  getTransformPlugins: async () => {
    const response = await apiClient.get<ApiResponse<Plugin[]>>('/etl/plugins', {
      params: { type: 'transform' }
    })
    return response.data.data
  },

  // 获取加载插件列表
  getLoadPlugins: async () => {
    const response = await apiClient.get<ApiResponse<Plugin[]>>('/etl/plugins', {
      params: { type: 'load' }
    })
    return response.data.data
  },
}
