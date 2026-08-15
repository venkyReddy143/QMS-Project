export type OrderStatus = 'released' | 'in_progress' | 'on_hold' | 'completed'
export type BatchStatus = 'planned' | 'released' | 'in_progress' | 'completed'
export type MachineStatus = 'available' | 'running' | 'setup' | 'down' | 'maintenance'
export type ShiftCode = 'A' | 'B' | 'C'
export type ProcessStepCode =
  | 'CASTING'
  | 'CNC'
  | 'COATING'
  | 'NDT'
  | 'FINAL_INSPECTION'
  | 'PACKING'

export interface ProcessStep {
  id: string
  code: ProcessStepCode
  name: string
  sequence: number
  standardHours: number
  machineTypeId: string
}

export interface MachineType {
  id: string
  code: string
  name: string
  description: string
}

export interface Machine {
  id: string
  code: string
  name: string
  machineTypeId: string
  status: MachineStatus
  shiftCapacityHours: number
}

export interface Shift {
  id: string
  code: ShiftCode
  name: string
  startTime: string
  endTime: string
  hours: number
}

export interface ProductionOrder {
  id: string
  orderNumber: string
  partNumber: string
  partDescription: string
  customer: string
  quantity: number
  dueDate: string
  status: OrderStatus
  priority: 'critical' | 'high' | 'normal'
}

export interface Batch {
  id: string
  batchNumber: string
  productionOrderId: string
  quantity: number
  status: BatchStatus
  plannedStart: string
  plannedEnd: string
}

export interface PieceSerial {
  id: string
  serialNumber: string
  productionOrderId: string
  batchId: string
  currentStepCode: ProcessStepCode | null
  completedStepCodes: ProcessStepCode[]
}

export interface DomainSnapshot {
  productionOrders: ProductionOrder[]
  batches: Batch[]
  processSteps: ProcessStep[]
  machineTypes: MachineType[]
  machines: Machine[]
  shifts: Shift[]
  pieceSerials: PieceSerial[]
}
