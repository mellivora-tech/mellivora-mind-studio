export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
}

export interface User {
  id: string
  email: string
  name: string
  role: 'LP' | 'MANAGER' | 'RESEARCHER' | 'ADMIN'
}

export interface Fund {
  id: string
  code: string
  name: string
}
