import type {
  CreateOrderPayload,
  CreateOrderResponse,
  GetOrderResponse,
  ListOrdersResponse,
  UpdateOrderDetailsPayload,
  UpdateOrderDetailsResponse,
  UpdateOrderPlanningPayload,
  UpdateOrderPlanningResponse,
} from '../../types/orders'
import { get, patch, post } from './http'

export function createOrderApi(payload: CreateOrderPayload) {
  return post<CreateOrderResponse, CreateOrderPayload>(
    '/orders/createOrder',
    payload,
  )
}

export function fetchNextOrderNoApi() {
  return get<{ success: boolean; orderNo?: string; message?: string }>(
    '/orders/next-order-no',
  )
}

export function fetchOrdersApi() {
  return get<ListOrdersResponse>('/orders')
}

export function fetchOrderApi(orderId: string) {
  return get<GetOrderResponse>(`/orders/${orderId}`)
}

export function updateOrderDetailsApi(
  orderId: string,
  payload: UpdateOrderDetailsPayload,
) {
  return patch<UpdateOrderDetailsResponse, UpdateOrderDetailsPayload>(
    `/orders/${orderId}/details`,
    payload,
  )
}

export function updateOrderPlanningApi(
  orderId: string,
  payload: UpdateOrderPlanningPayload,
) {
  return patch<UpdateOrderPlanningResponse, UpdateOrderPlanningPayload>(
    `/orders/${orderId}/planning`,
    payload,
  )
}
