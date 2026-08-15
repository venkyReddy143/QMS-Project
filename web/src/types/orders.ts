export type OrderPriorityApi = 'NORMAL' | 'HIGH' | 'URGENT'

export interface CreateOrderProcessStepPayload {
  name: string
  hoursPerPiece: number
  isCustom: boolean
  code?: string
}

export interface CreateOrderPayload {
  customerName: string
  productId: string
  customerPoRef: string
  totalQuantity: number
  budget?: number
  estimationPrice: number
  primaryMachineType: string
  additionalMachineTypes: string[]
  processSteps: CreateOrderProcessStepPayload[]
  dueDate: string
  priority: OrderPriorityApi
  notes: string
}

export interface CreatedOrder {
  id: string
  orderNo: string
  customerName: string
  customerPoRef: string
  productId: string
  productCode: string
  productName: string
  totalQuantity: number
  estimationPrice: number
  status: string
}

export interface CreateOrderResponse {
  success: boolean
  message: string
  order?: CreatedOrder
}
