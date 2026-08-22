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

export const MACHINE_STATUSES = [
  'AVAILABLE',
  'BUSY',
  'MAINTENANCE',
  'DOWN',
  'INACTIVE',
] as const
export type MachineStatus = (typeof MACHINE_STATUSES)[number]

export const MACHINE_HEALTH_STATUSES = [
  'HEALTHY',
  'ATTENTION',
  'UNHEALTHY',
] as const
export type MachineHealthStatus = (typeof MACHINE_HEALTH_STATUSES)[number]

export const BATCH_STATUSES = [
  'SCHEDULED',
  'RELEASED',
  'IN_ASSEMBLY',
  'READY_FOR_QA',
  'QA_RELEASED',
  'PARTIALLY_DISPATCHED',
  'DISPATCHED',
  'COMPLETED',
  'ON_HOLD',
] as const
export type BatchStatus = (typeof BATCH_STATUSES)[number]

export const SERIAL_STATUSES = [
  'QUEUED',
  'IN_PROGRESS',
  'COMPLETED',
  'ON_HOLD',
] as const
export type SerialStatus = (typeof SERIAL_STATUSES)[number]
