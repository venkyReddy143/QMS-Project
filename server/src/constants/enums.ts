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
  'CREATED',
  'ACTIVE',
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
  'QC_REJECTED',
  'FULL_READY',
] as const
export type SerialStatus = (typeof SERIAL_STATUSES)[number]

export const ORDER_LINE_STATUSES = [
  'OPEN',
  'IN_PRODUCTION',
  'COMPLETED',
  'ON_HOLD',
] as const
export type OrderLineStatus = (typeof ORDER_LINE_STATUSES)[number]

export const RAW_MATERIAL_SOURCES = ['COMPANY', 'CUSTOMER'] as const
export type RawMaterialSource = (typeof RAW_MATERIAL_SOURCES)[number]

export const STOCK_ENTRY_TYPES = ['ISSUE', 'RECEIPT'] as const
export type StockEntryType = (typeof STOCK_ENTRY_TYPES)[number]

export const STOCK_TRANSFER_TYPES = [
  'STORE_TO_OPERATOR',
  'OPERATOR_TO_STORE',
  'STORE_TO_VENDOR',
  'VENDOR_TO_STORE',
  'STORE_TO_DISPOSE',
  'MISSING',
] as const
export type StockTransferType = (typeof STOCK_TRANSFER_TYPES)[number]

export const INVENTORY_SERIAL_STATUSES = [
  'IN_STORE',
  'WITH_OPERATOR',
  'WITH_VENDOR',
  'DISPOSED',
  'MISSING',
] as const
export type InventorySerialStatus = (typeof INVENTORY_SERIAL_STATUSES)[number]
