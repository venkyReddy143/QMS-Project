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
  location: string
  operatorSkills: string
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
  isSerialControl: boolean
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

export interface AdminMachineType {
  id: string
  name: string
  status: string
}

export interface AdminCalendar {
  id: string
  name: string
  workingDays: string[]
  status: string
}

export interface CalendarDayPerson {
  id: string
  name: string
  employeeCode: string
}

export interface CalendarDayStats {
  date: string
  weekday: string
  isWorkingDay: boolean
  calendarName: string
  machines: {
    working: number
    repaired: number
    down: number
    inactive: number
    total: number
  }
  ordersOngoing: number
  ordersCreated: number
  productsProduced: number
  hoursLogged: number
  batchesWorked: number
  employeesWorking: number
  employeesOnLeave: number
  employeesTotal: number
  workingNames: CalendarDayPerson[]
  leaveNames: CalendarDayPerson[]
}

export interface CalendarDayStatsResponse {
  success: boolean
  message?: string
  stats: CalendarDayStats
}

export interface CalendarHistoryResponse {
  success: boolean
  message?: string
  from: string
  to: string
  days: CalendarDayStats[]
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

export interface AdminMachineTypesResponse {
  success: boolean
  message?: string
  machineTypes: AdminMachineType[]
}

export interface AdminCalendarsResponse {
  success: boolean
  message?: string
  calendars: AdminCalendar[]
}

export const ASSIGNABLE_ROLES: Array<{ value: ApiUserRole; label: string }> = [
  { value: 'MANAGER', label: 'Order Creator' },
  { value: 'SUPERVISOR', label: 'Production Manager' },
  { value: 'SHOP_FLOOR_OPERATOR', label: 'Floor Manager' },
  { value: 'SUPER_ADMIN', label: 'Super Admin' },
]

export interface InventorySerialRow {
  serialNumber: string
  status: string
  holderName: string
}

export interface InventoryProduct {
  productId: string
  productCode: string
  name: string
  uom: string
  productType: string
  isSerialControl: boolean
  onHandQty: number
  serials: InventorySerialRow[]
}

export interface InventoryResponse {
  success: boolean
  message?: string
  inventory: InventoryProduct[]
}

export type StockTransferType =
  | 'STORE_TO_OPERATOR'
  | 'OPERATOR_TO_STORE'
  | 'STORE_TO_VENDOR'
  | 'VENDOR_TO_STORE'
  | 'STORE_TO_DISPOSE'
  | 'MISSING'

export interface StockEntryPayload {
  entryType: 'ISSUE' | 'RECEIPT'
  productId: string
  serialNumber?: string
  quantity?: number
  transferType: StockTransferType
  fromPersonId?: string
  fromPersonName: string
  toPersonId?: string
  toPersonName: string
  remarks: string
}

export interface StockEntryResponse {
  success: boolean
  message: string
  onHandQty?: number
}

export const STOCK_TRANSFER_OPTIONS: Array<{ value: StockTransferType; label: string }> = [
  { value: 'STORE_TO_OPERATOR', label: 'Store to operator' },
  { value: 'OPERATOR_TO_STORE', label: 'Operator to store' },
  { value: 'STORE_TO_VENDOR', label: 'Store to vendor' },
  { value: 'VENDOR_TO_STORE', label: 'Vendor to store' },
  { value: 'STORE_TO_DISPOSE', label: 'Store to dispose' },
  { value: 'MISSING', label: 'Missing' },
]
