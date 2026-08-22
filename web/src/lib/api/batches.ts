import type {
  CreateBatchPayload,
  CreateBatchResponse,
  EmployeesResponse,
  ListBatchesResponse,
  ProductionBatch,
} from '../../types/orders'
import { get, post } from './http'

export function fetchBatchesApi(orderId: string) {
  return get<ListBatchesResponse>(`/orders/${orderId}/batches`)
}

export function createBatchApi(orderId: string, payload: CreateBatchPayload) {
  return post<CreateBatchResponse, CreateBatchPayload>(
    `/orders/${orderId}/batches`,
    payload,
  )
}

export function assignBatchApi(
  orderId: string,
  batchId: string,
  payload: { employeeId: string; shift: string },
) {
  return post<{ success: boolean; message: string; batch?: ProductionBatch }>(
    `/orders/${orderId}/batches/${batchId}/assign`,
    payload,
  )
}

export function logBatchTimeApi(
  orderId: string,
  batchId: string,
  payload: { employeeId: string; shift: string; hours: number; note?: string },
) {
  return post<{ success: boolean; message: string; batch?: ProductionBatch }>(
    `/orders/${orderId}/batches/${batchId}/time-logs`,
    payload,
  )
}

export function fetchEmployeesApi() {
  return get<EmployeesResponse>('/employees')
}
