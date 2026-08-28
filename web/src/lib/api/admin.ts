import type {
  AdminCustomersResponse,
  AdminCustomer,
  AdminMachine,
  AdminMachinesResponse,
  AdminProcessStep,
  AdminProcessStepsResponse,
  AdminProduct,
  AdminProductsResponse,
  AdminSummaryResponse,
  AdminUserMutationResponse,
  AdminUsersResponse,
  CreateAdminUserPayload,
  UpdateAdminUserPayload,
} from '../../types/admin'
import { del, get, patch, post } from './http'

export function fetchAdminSummaryApi() {
  return get<AdminSummaryResponse>('/admin/summary')
}

export function fetchAdminUsersApi() {
  return get<AdminUsersResponse>('/admin/users')
}

export function createAdminUserApi(payload: CreateAdminUserPayload) {
  return post<AdminUserMutationResponse, CreateAdminUserPayload>(
    '/admin/users',
    payload,
  )
}

export function updateAdminUserApi(id: string, payload: UpdateAdminUserPayload) {
  return patch<AdminUserMutationResponse, UpdateAdminUserPayload>(
    `/admin/users/${id}`,
    payload,
  )
}

export function deleteAdminUserApi(id: string) {
  return del<{ success: boolean; message: string }>(`/admin/users/${id}`)
}

export function fetchAdminMachinesApi() {
  return get<AdminMachinesResponse>('/admin/machines')
}

export function createAdminMachineApi(payload: Partial<AdminMachine>) {
  return post<{ success: boolean; message: string; machine?: AdminMachine }>(
    '/admin/machines',
    payload,
  )
}

export function updateAdminMachineApi(id: string, payload: Partial<AdminMachine>) {
  return patch<{ success: boolean; message: string; machine?: AdminMachine }>(
    `/admin/machines/${id}`,
    payload,
  )
}

export function deleteAdminMachineApi(id: string) {
  return del<{ success: boolean; message: string }>(`/admin/machines/${id}`)
}

export function fetchAdminProductsApi() {
  return get<AdminProductsResponse>('/admin/products')
}

export function createAdminProductApi(payload: Partial<AdminProduct>) {
  return post<{ success: boolean; message: string; product?: AdminProduct }>(
    '/admin/products',
    payload,
  )
}

export function updateAdminProductApi(id: string, payload: Partial<AdminProduct>) {
  return patch<{ success: boolean; message: string; product?: AdminProduct }>(
    `/admin/products/${id}`,
    payload,
  )
}

export function deleteAdminProductApi(id: string) {
  return del<{ success: boolean; message: string }>(`/admin/products/${id}`)
}

export function fetchAdminProcessStepsApi() {
  return get<AdminProcessStepsResponse>('/admin/process-steps')
}

export function createAdminProcessStepApi(payload: Partial<AdminProcessStep>) {
  return post<{
    success: boolean
    message: string
    processStep?: AdminProcessStep
  }>('/admin/process-steps', payload)
}

export function updateAdminProcessStepApi(
  id: string,
  payload: Partial<AdminProcessStep>,
) {
  return patch<{
    success: boolean
    message: string
    processStep?: AdminProcessStep
  }>(`/admin/process-steps/${id}`, payload)
}

export function deleteAdminProcessStepApi(id: string) {
  return del<{ success: boolean; message: string }>(`/admin/process-steps/${id}`)
}

export function fetchAdminCustomersApi() {
  return get<AdminCustomersResponse>('/admin/customers')
}

export function createAdminCustomerApi(payload: Partial<AdminCustomer>) {
  return post<{ success: boolean; message: string; customer?: AdminCustomer }>(
    '/admin/customers',
    payload,
  )
}

export function updateAdminCustomerApi(id: string, payload: Partial<AdminCustomer>) {
  return patch<{ success: boolean; message: string; customer?: AdminCustomer }>(
    `/admin/customers/${id}`,
    payload,
  )
}

export function deleteAdminCustomerApi(id: string) {
  return del<{ success: boolean; message: string }>(`/admin/customers/${id}`)
}
