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
