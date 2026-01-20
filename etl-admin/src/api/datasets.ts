import { apiClient } from './client'
import type { 
  DataSet, 
  DataSetVersion,
  FieldDefinition,
  ApiResponse, 
  PaginatedResponse 
} from '@/types/etl'

const BASE_PATH = '/etl/datasets'

export const datasetsApi = {
  // 获取数据集列表
  list: async (params?: { 
    category?: string
    storage?: string
    status?: string
    page?: number
    pageSize?: number 
  }) => {
    const response = await apiClient.get<PaginatedResponse<DataSet>>(BASE_PATH, { params })
    return response.data
  },

  // 获取单个数据集
  get: async (id: string) => {
    const response = await apiClient.get<ApiResponse<DataSet>>(`${BASE_PATH}/${id}`)
    return response.data.data
  },

  // 创建数据集
  create: async (data: Partial<DataSet>) => {
    const response = await apiClient.post<ApiResponse<DataSet>>(BASE_PATH, data)
    return response.data.data
  },

  // 更新数据集
  update: async (id: string, data: Partial<DataSet>) => {
    const response = await apiClient.put<ApiResponse<DataSet>>(`${BASE_PATH}/${id}`, data)
    return response.data.data
  },

  // 删除数据集
  delete: async (id: string) => {
    await apiClient.delete(`${BASE_PATH}/${id}`)
  },

  // 获取版本历史
  getVersions: async (id: string) => {
    const response = await apiClient.get<ApiResponse<DataSetVersion[]>>(`${BASE_PATH}/${id}/versions`)
    return response.data.data
  },

  // 预览DDL
  previewDDL: async (id: string) => {
    const response = await apiClient.get<ApiResponse<{ ddl: string }>>(`${BASE_PATH}/${id}/preview-ddl`)
    return response.data.data.ddl
  },

  // 预览数据
  previewData: async (id: string, limit = 10) => {
    const response = await apiClient.get<ApiResponse<{ columns: string[]; rows: unknown[][] }>>(
      `${BASE_PATH}/${id}/preview-data`,
      { params: { limit } }
    )
    return response.data.data
  },

  // 应用迁移
  applyMigration: async (id: string) => {
    const response = await apiClient.post<ApiResponse<{ success: boolean; message?: string }>>(
      `${BASE_PATH}/${id}/apply-migration`
    )
    return response.data.data
  },

  // 获取分类列表
  getCategories: async () => {
    const response = await apiClient.get<ApiResponse<string[]>>(`${BASE_PATH}/categories`)
    return response.data.data
  },

  // 验证字段定义
  validateSchema: async (fields: FieldDefinition[]) => {
    const response = await apiClient.post<ApiResponse<{ valid: boolean; errors?: string[] }>>(
      `${BASE_PATH}/validate-schema`,
      { fields }
    )
    return response.data.data
  },
}
