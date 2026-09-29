import type {
  CreatePlanPayload,
  GetPlanResponse,
  ListPlansResponse,
  PlanMutationResponse,
  PlanningOptionsResponse,
  UpdatePlanPayload,
} from '../../types/planning'
import { del, get, post, put } from './http'

export interface PlanFilters {
  date?: string
  shift?: string
  machineId?: string
  operatorId?: string
  batchId?: string
  status?: string
  search?: string
}

export function fetchPlansApi(filters?: PlanFilters) {
  const params = new URLSearchParams()
  if (filters?.date) params.set('date', filters.date)
  if (filters?.shift) params.set('shift', filters.shift)
  if (filters?.machineId) params.set('machineId', filters.machineId)
  if (filters?.operatorId) params.set('operatorId', filters.operatorId)
  if (filters?.batchId) params.set('batchId', filters.batchId)
  if (filters?.status) params.set('status', filters.status)
  if (filters?.search) params.set('search', filters.search)

  const query = params.toString()
  return get<ListPlansResponse>(`/planning${query ? `?${query}` : ''}`)
}

export function fetchPlanningOptionsApi() {
  return get<PlanningOptionsResponse>('/planning/options')
}

export function fetchPlanApi(id: string) {
  return get<GetPlanResponse>(`/planning/${id}`)
}

export function createPlanApi(payload: CreatePlanPayload) {
  return post<PlanMutationResponse, CreatePlanPayload>('/planning', payload)
}

export function updatePlanApi(id: string, payload: UpdatePlanPayload) {
  return put<PlanMutationResponse, UpdatePlanPayload>(`/planning/${id}`, payload)
}

export function deletePlanApi(id: string) {
  return del<{ success: boolean; message: string }>(`/planning/${id}`)
}
