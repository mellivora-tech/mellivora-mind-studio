import { apiClient } from './client'
import type { 
  DataSource, 
  DataSourceFormData, 
  ApiResponse, 
  PaginatedResponse,
  Plugin 
} from '@/types/etl'

const BASE_PATH = '/etl/datasources'

export const datasourcesApi = {
  // 获取数据源列表
  list: async (params?: { 
    type?: string
    status?: string
    page?: number
    pageSize?: number 
  }) => {
    const response = await apiClient.get<PaginatedResponse<DataSource>>(BASE_PATH, { params })
    return response.data
  },

  // 获取单个数据源
  get: async (id: string) => {
    const response = await apiClient.get<ApiResponse<DataSource>>(`${BASE_PATH}/${id}`)
    return response.data.data
  },

  // 创建数据源
  create: async (data: DataSourceFormData) => {
    const response = await apiClient.post<ApiResponse<DataSource>>(BASE_PATH, data)
    return response.data.data
  },

  // 更新数据源
  update: async (id: string, data: Partial<DataSourceFormData>) => {
    const response = await apiClient.put<ApiResponse<DataSource>>(`${BASE_PATH}/${id}`, data)
    return response.data.data
  },

  // 删除数据源
  delete: async (id: string) => {
    await apiClient.delete(`${BASE_PATH}/${id}`)
  },

  // 测试数据源连接
  test: async (id: string) => {
    const response = await apiClient.post<ApiResponse<{ success: boolean; message?: string }>>(
      `${BASE_PATH}/${id}/test`
    )
    return response.data.data
  },

  // 获取可用插件列表
  getPlugins: async () => {
    const response = await apiClient.get<ApiResponse<Plugin[]>>('/etl/plugins', {
      params: { type: 'extract' }
    })
    return response.data.data
  },
}
