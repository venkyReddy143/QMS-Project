export type PlanStatus =
  | 'PLANNED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'ON_HOLD'
  | 'CANCELLED'

export interface ProductionPlan {
  id: string
  planNo: string
  batchId: string
  batchNo: string
  orderId?: string
  orderNo?: string
  productId: string
  productCode: string
  productName: string
  planDate: string
  startDate?: string
  endDate?: string
  shift: string
  processStepId?: string
  processStepName: string
  processStepInfo: string
  process: string
  machineId: string
  machineCode: string
  machineName: string
  operatorId: string
  operatorCode?: string
  operatorName: string
  plannedQuantity: number
  status: PlanStatus
  actualQuantity: number
  rejectedQuantity: number
  reworkQuantity: number
  notes?: string
  startedAt?: string
  completedAt?: string
  createdBy?: string
  createdAt?: string
  updatedAt?: string
}

export interface PlanningBatchOption {
  id: string
  batchNo: string
  orderNo: string
  orderId: string
  productId: string
  productName: string
  plannedQuantity: number
  processStepNames: string[]
  processMachines: Array<{
    processStepName: string
    sequence?: number
    machineId?: string
    machineCode?: string
    machineName?: string
  }>
}

export interface PlanningProductOption {
  id: string
  productCode: string
  name: string
  uom: string
  productType: string
}

export interface PlanningStepOption {
  id: string
  code: string
  name: string
  category: string
  standardHoursPerPiece?: number
}

export interface PlanningMachineOption {
  id: string
  machineCode: string
  name: string
  machineType: string
  bay: string
  status: string
  maintenanceStatus: string
}

export interface PlanningOperatorOption {
  id: string
  employeeCode: string
  name: string
  role: string
}

export interface PlanningShiftOption {
  shiftCode: string
  name: string
  startTime: string
  endTime: string
}

export interface PlanningOptions {
  batches: PlanningBatchOption[]
  products: PlanningProductOption[]
  processSteps: PlanningStepOption[]
  machines: PlanningMachineOption[]
  operators: PlanningOperatorOption[]
  shifts: PlanningShiftOption[]
}

export interface CreatePlanPayload {
  batchId: string
  productId: string
  planDate?: string
  startDate?: string
  endDate?: string
  shift: string
  processStepId?: string
  processStepName: string
  processStepInfo?: string
  process: string
  machineId: string
  operatorId: string
  plannedQuantity: number
  notes?: string
  status?: PlanStatus
}

export interface UpdatePlanPayload {
  batchId?: string
  productId?: string
  planDate?: string
  startDate?: string
  endDate?: string
  shift?: string
  processStepId?: string
  processStepName?: string
  processStepInfo?: string
  process?: string
  machineId?: string
  operatorId?: string
  plannedQuantity?: number
  notes?: string
  status?: PlanStatus
  actualQuantity?: number
  rejectedQuantity?: number
  reworkQuantity?: number
}

export interface ListPlansResponse {
  success: boolean
  message?: string
  plans: ProductionPlan[]
}

export interface GetPlanResponse {
  success: boolean
  message?: string
  plan: ProductionPlan
}

export interface PlanningOptionsResponse {
  success: boolean
  message?: string
  options: PlanningOptions
}

export interface PlanMutationResponse {
  success: boolean
  message: string
  plan?: ProductionPlan
}
