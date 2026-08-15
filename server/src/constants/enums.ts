export const MASTER_STATUSES = ['ACTIVE', 'INACTIVE'] as const
export type MasterStatus = (typeof MASTER_STATUSES)[number]

export const PRODUCT_TYPES = ['PRODUCT', 'SPARE', 'TOOL'] as const
export type ProductType = (typeof PRODUCT_TYPES)[number]

export const ORDER_STATUSES = [
  'DRAFT',
  'RELEASED',
  'IN_PRODUCTION',
  'PARTIALLY_COMPLETED',
  'COMPLETED',
  'ON_HOLD',
  'CANCELLED',
] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]

export const ORDER_PRIORITIES = ['NORMAL', 'HIGH', 'CRITICAL'] as const
export type OrderPriority = (typeof ORDER_PRIORITIES)[number]

export const ROUTE_STATUSES = ['ACTIVE', 'INACTIVE'] as const
export type RouteStatus = (typeof ROUTE_STATUSES)[number]
