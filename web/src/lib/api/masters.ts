import type {
  CustomersResponse,
  MachinesResponse,
  ProcessStepsResponse,
  ProductsResponse,
} from '../../types/masters'
import { get } from './http'

export function fetchCustomersApi() {
  return get<CustomersResponse>('/customers')
}

export function fetchProductsApi() {
  return get<ProductsResponse>('/products')
}

export function fetchProcessStepsApi() {
  return get<ProcessStepsResponse>('/process-steps')
}

export function fetchMachinesApi() {
  return get<MachinesResponse>('/machines')
}
