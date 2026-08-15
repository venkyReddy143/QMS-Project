export interface CustomerOption {
  id: string
  name: string
}

export interface ProductProcessStep {
  sequence: number
  name: string
  code: string
  machineType: string
  hoursPerPiece: number
}

export interface ProductOption {
  id: string
  productCode: string
  name: string
  description: string
  uom: string
  unitRate: number
  processSteps: ProductProcessStep[]
}

export interface CustomersResponse {
  success: boolean
  message?: string
  customers: CustomerOption[]
}

export interface ProductsResponse {
  success: boolean
  message?: string
  products: ProductOption[]
}

export interface ProcessStepOption {
  id: string
  code: string
  name: string
  category: string
  standardHoursPerPiece: number
  requiresQualityRelease: boolean
}

export interface MachineOption {
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

export interface ProcessStepsResponse {
  success: boolean
  message?: string
  processSteps: ProcessStepOption[]
}

export interface MachinesResponse {
  success: boolean
  message?: string
  machines: MachineOption[]
}
