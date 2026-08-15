import type { CreateOrderPayload, CreateOrderResponse } from '../../types/orders'
import { post } from './http'

export function createOrderApi(payload: CreateOrderPayload) {
  return post<CreateOrderResponse, CreateOrderPayload>(
    '/orders/createOrder',
    payload,
  )
}
