import type { ApiUser, ApiUserRole } from './auth'

export interface AdminUserRecord extends ApiUser {}

export interface AdminUsersResponse {
  success: boolean
  message?: string
  users: AdminUserRecord[]
}

export interface AdminUserMutationResponse {
  success: boolean
  message: string
  user?: AdminUserRecord
}

export interface CreateAdminUserPayload {
  employeeCode: string
  name: string
  email: string
  phone: string
  password: string
  role: ApiUserRole
  status: 'ACTIVE' | 'INACTIVE'
}

export interface UpdateAdminUserPayload {
  employeeCode?: string
  name?: string
  email?: string
  phone?: string
  password?: string
  role?: ApiUserRole
  status?: 'ACTIVE' | 'INACTIVE'
}

export interface AdminSummary {
  users: number
  machines: number
  products: number
  processSteps: number
  customers: number
  orders: number
}

export interface AdminSummaryResponse {
  success: boolean
  message?: string
  summary: AdminSummary
}

export interface AdminMachine {
  id: string
  machineCode: string
  name: string
  machineType: string
  bay: string
  maxHoursPerShift: number
  status: string
  maintenanceStatus: string
  active: boolean
}

export interface AdminProduct {
  id: string
  productCode: string
  name: string
  description: string
  uom: string
  revision: string
  productType: string
  unitRate: number
  status: string
}

export interface AdminProcessStep {
  id: string
  code: string
  name: string
  category: string
  standardHoursPerPiece: number
  requiresQualityRelease: boolean
  status: string
}

export interface AdminCustomer {
  id: string
  name: string
  status: string
}

export interface AdminMachinesResponse {
  success: boolean
  message?: string
  machines: AdminMachine[]
}

export interface AdminProductsResponse {
  success: boolean
  message?: string
  products: AdminProduct[]
}

export interface AdminProcessStepsResponse {
  success: boolean
  message?: string
  processSteps: AdminProcessStep[]
}

export interface AdminCustomersResponse {
  success: boolean
  message?: string
  customers: AdminCustomer[]
}

export const ASSIGNABLE_ROLES: Array<{ value: ApiUserRole; label: string }> = [
  { value: 'MANAGER', label: 'Order Creator' },
  { value: 'SUPERVISOR', label: 'Production Manager' },
  { value: 'SHOP_FLOOR_OPERATOR', label: 'Floor Manager' },
  { value: 'SUPER_ADMIN', label: 'Super Admin' },
]
