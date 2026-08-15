import type { CustomersResponse, ProductsResponse } from '../../types/masters'
import { get } from './http'

export function fetchCustomersApi() {
  return get<CustomersResponse>('/customers')
}

export function fetchProductsApi() {
  return get<ProductsResponse>('/products')
}
