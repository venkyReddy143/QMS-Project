import type {
  CreateBatchPayload,
  CreateBatchResponse,
  EmployeesResponse,
  ListBatchesResponse,
  ProductionBatch,
} from '../../types/orders'
import { get, post } from './http'

export function fetchAllBatchesApi() {
  return get<ListBatchesResponse>('/batches/listBatches')
}

export function fetchBatchesApi(orderId: string) {
  return get<ListBatchesResponse>(`/orders/${orderId}/batches`)
}

export function createBatchApi(orderId: string, payload: CreateBatchPayload) {
  return post<CreateBatchResponse, CreateBatchPayload>(
    `/orders/${orderId}/batches`,
    payload,
  )
}

export function activateBatchApi(
  orderId: string,
  batchId: string,
  payload?: {
    productionInCharge?: string
    processMachines?: Array<{
      processStepName: string
      sequence: number
      machineId?: string
    }>
  },
) {
  return post<{ success: boolean; message: string; batch?: ProductionBatch }>(
    `/orders/${orderId}/batches/${batchId}/activate`,
    payload ?? {},
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

export function assignSerialsApi(
  orderId: string,
  batchId: string,
  payload: {
    serialNumbers: string[]
    shift: string
    machineId?: string
    operatorId?: string
    processStepName?: string
  },
) {
  return post<{ success: boolean; message: string; batch?: ProductionBatch }>(
    `/orders/${orderId}/batches/${batchId}/assign-serials`,
    payload,
  )
}

export function updateBatchSerialsApi(
  orderId: string,
  batchId: string,
  payload: {
    operatorId?: string
    shift?: string
    machineId?: string
    updates: Array<{
      serialNumber: string
      status?: string
      completedPercent?: number
      comments?: string
      currentProcessStepName?: string
    }>
  },
) {
  return post<{ success: boolean; message: string; batch?: ProductionBatch }>(
    `/orders/${orderId}/batches/${batchId}/serials`,
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
