export type OrderPriorityApi = 'NORMAL' | 'HIGH' | 'URGENT'

export interface CreateOrderProductPayload {
  productId: string
  quantity: number
}

export interface CreateOrderPayload {
  customerPoRef: string
  products: CreateOrderProductPayload[]
  budget?: number
  estimationPrice?: number
  dueDate: string
  priority: OrderPriorityApi
  notes: string
}

export interface OrderProcessStep {
  name: string
  hoursPerPiece: number
  isCustom: boolean
  code?: string
}

export interface OrderProductLine {
  productId: string
  productCode: string
  productName: string
  quantity: number
  uom: string
  unitRate: number
  estimationPrice: number
  primaryMachineId?: string
  primaryMachineType?: string
  processSteps?: OrderProcessStep[]
}

export interface UpdateOrderPlanningPayload {
  customerName: string
  products: Array<{
    productId: string
    primaryMachineId: string
    processSteps: OrderProcessStep[]
  }>
}

export interface UpdateOrderPlanningResponse {
  success: boolean
  message: string
  order?: ProductionOrder
}

export interface ProductionOrder {
  id: string
  orderNo: string
  customerName?: string
  customerPoRef: string
  products: OrderProductLine[]
  productId?: string
  productCode?: string
  productName: string
  totalQuantity: number
  uom?: string
  budget?: number | null
  estimationPrice: number
  dueDate?: string
  priority?: string
  notes?: string
  status: string
  createdAt?: string
  updatedAt?: string
}

export type CreatedOrder = ProductionOrder

export interface CreateOrderResponse {
  success: boolean
  message: string
  order?: ProductionOrder
}

export interface ListOrdersResponse {
  success: boolean
  message?: string
  orders: ProductionOrder[]
}

export interface GetOrderResponse {
  success: boolean
  message?: string
  order?: ProductionOrder
}

export type ShiftCode = 'A' | 'B' | 'C'

export interface BatchAssignment {
  employeeId: string
  employeeName: string
  shift: string
  assignedAt?: string
}

export interface BatchTimeLog {
  employeeId: string
  employeeName: string
  shift: string
  hours: number
  note?: string
  loggedAt?: string
}

export type SerialStatusApi = 'QUEUED' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD'

export interface BatchSerial {
  serialNumber: string
  sequence: number
  status: SerialStatusApi | string
}

export interface ProductionBatch {
  id: string
  orderId: string
  orderNo: string
  productId?: string
  productName?: string
  processStepName?: string
  batchNo: string
  plannedQuantity: number
  targetDispatchDate: string
  priority: string
  status: string
  assignments: BatchAssignment[]
  timeLogs: BatchTimeLog[]
  loggedHours: number
  serials: BatchSerial[]
  serialCount?: number
  createdBy?: string
  createdAt?: string
}

export interface CreateBatchPayload {
  productId: string
  processStepName?: string
  batchNo: string
  plannedQuantity: number
  targetDispatchDate: string
  priority: OrderPriorityApi
}

export interface CreateBatchResponse {
  success: boolean
  message: string
  batch?: ProductionBatch
}

export interface ListBatchesResponse {
  success: boolean
  message?: string
  batches: ProductionBatch[]
}

export interface EmployeeOption {
  id: string
  name: string
  employeeCode: string
  role: string
}

export interface EmployeesResponse {
  success: boolean
  message?: string
  employees: EmployeeOption[]
}
