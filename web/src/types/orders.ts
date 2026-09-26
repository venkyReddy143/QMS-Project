export type OrderPriorityApi = 'NORMAL' | 'HIGH' | 'URGENT'

export type RawMaterialSourcing = 'COMPANY' | 'CUSTOMER'
export type OrderLineStatusApi =
  | 'OPEN'
  | 'CLOSED'
  | 'IN_PRODUCTION'
  | 'COMPLETED'
  | 'ON_HOLD'

export interface CreateOrderProductPayload {
  productId: string
  quantity: number
  description?: string
  drawingNumber?: string
  remarks?: string
  rawMaterialSourcing?: RawMaterialSourcing
  lineStatus?: 'OPEN' | 'CLOSED' | OrderLineStatusApi
}

export interface CreateOrderPayload {
  customerPoRef: string
  orderNo?: string
  customerName?: string
  ownerName?: string
  inChargeName?: string
  orderDate?: string
  status?: 'OPEN' | 'CLOSED' | string
  products?: CreateOrderProductPayload[]
  budget?: number
  estimationPrice?: number
  dueDate?: string
  priority?: OrderPriorityApi
  notes?: string
}

export interface UpdateOrderDetailsPayload {
  products?: CreateOrderProductPayload[]
  dueDate?: string
  priority?: OrderPriorityApi
  notes?: string
  status?: 'OPEN' | 'CLOSED' | string
}

export interface UpdateOrderDetailsResponse {
  success: boolean
  message: string
  order?: ProductionOrder
}

export interface OrderProcessStep {
  name: string
  hoursPerPiece: number
  isCustom: boolean
  code?: string
  sequence?: number
  machineId?: string
  machineCode?: string
  machineName?: string
}

export interface OrderProductLine {
  productId: string
  productCode: string
  productName: string
  lineNumber?: number
  quantity: number
  description?: string
  drawingNumber?: string
  remarks?: string
  lineStatus?: OrderLineStatusApi | string
  rawMaterialSourcing?: RawMaterialSourcing | string
  uom: string
  unitRate: number
  estimationPrice: number
  primaryMachineId?: string
  primaryMachineType?: string
  processSteps?: OrderProcessStep[]
}

export interface UpdateOrderPlanningPayload {
  customerName: string
  ownerName?: string
  inChargeName?: string
  products: Array<{
    productId: string
    primaryMachineId: string
    drawingNumber?: string
    remarks?: string
    rawMaterialSourcing?: RawMaterialSourcing
    lineStatus?: OrderLineStatusApi
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
  orderDate?: string
  customerName?: string
  customerPoRef: string
  ownerName?: string
  inChargeName?: string
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
  createdBy?: string
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

export type SerialStatusApi =
  | 'QUEUED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'ON_HOLD'
  | 'QC_REJECTED'
  | 'FULL_READY'

export interface BatchSerial {
  serialNumber: string
  sequence: number
  status: SerialStatusApi | string
  currentProcessStepName?: string
  completedPercent?: number
  comments?: string
  machineId?: string
  machineCode?: string
  shift?: string
  operatorId?: string
  operatorName?: string
}

export interface BatchAssignedMachine {
  machineId: string
  machineCode: string
  machineName: string
}

export interface BatchProcessMachine {
  processStepName: string
  sequence: number
  machineId?: string
  machineCode?: string
  machineName?: string
}

export interface BatchProcessQtyStep {
  name: string
  sequence?: number
  status?: string
  inProgress: number
  queue: number
  qcRejected?: number
  completed?: number
  fullReady?: number
}

export interface BatchProcessQtys {
  total: number
  notStarted: number
  qcRejected?: number
  fullReady?: number
  steps: BatchProcessQtyStep[]
}

export interface ProductionBatch {
  id: string
  orderId: string
  orderNo: string
  productId?: string
  productName?: string
  productDescription?: string
  drawingNumber?: string
  lineNumber?: number | null
  processStepName?: string
  processStepNames?: string[]
  processMachines?: BatchProcessMachine[]
  batchNo: string
  plannedQuantity: number
  targetDispatchDate: string
  priority: string
  status: string
  productionInCharge?: string
  assignments: BatchAssignment[]
  timeLogs: BatchTimeLog[]
  loggedHours: number
  serials: BatchSerial[]
  serialCount?: number
  assignedMachines?: BatchAssignedMachine[]
  processQtys?: BatchProcessQtys
  createdBy?: string
  createdById?: string
  createdAt?: string
}

export interface CreateBatchPayload {
  productId: string
  processStepName?: string
  machineIds?: string[]
  processMachines?: Array<{
    processStepName: string
    sequence: number
    machineId?: string
  }>
  deferSerials?: boolean
  productionInCharge?: string
  status?: string
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
