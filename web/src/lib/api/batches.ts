import type {
  CreateBatchPayload,
  ProcessStepAttachment,
  CreateBatchResponse,
  EmployeesResponse,
  ListBatchesResponse,
  ProductionBatch,
  UpdateBatchPayload,
  UpdateBatchProcessStepsPayload,
  UpdateBatchProcessStepsResponse,
  UpdateBatchResponse,
} from '../../types/orders'
import { apiClient } from './client'
import { get, patch, post } from './http'

/** Uploads files (multipart, via Multer on the server) and returns their stored metadata. */
export async function uploadProcessStepAttachmentsApi(files: File[]) {
  const formData = new FormData()
  files.forEach((file) => formData.append('files', file))
  const response = await apiClient.post<{
    success: boolean
    message: string
    attachments?: ProcessStepAttachment[]
  }>('/batches/process-step-attachments', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000,
  })
  return response.data
}

/** Absolute URL for a stored attachment (files are served by the API host). */
export function attachmentHref(url: string): string {
  if (/^https?:\/\//i.test(url)) return url
  const base = String(apiClient.defaults.baseURL ?? '')
  try {
    return new URL(url, base || window.location.origin).toString()
  } catch {
    return url
  }
}

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

export function updateBatchApi(batchId: string, payload: UpdateBatchPayload) {
  return patch<UpdateBatchResponse, UpdateBatchPayload>(
    `/batches/updateBatch/${batchId}`,
    payload,
  )
}

export function updateBatchProcessStepsApi(
  orderId: string,
  batchId: string,
  payload: UpdateBatchProcessStepsPayload,
) {
  return patch<UpdateBatchProcessStepsResponse, UpdateBatchProcessStepsPayload>(
    `/orders/${orderId}/batches/${batchId}/process-steps`,
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
