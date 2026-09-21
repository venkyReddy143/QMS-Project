export const MASTER_STATUSES = ['ACTIVE', 'INACTIVE'] as const
export type MasterStatus = (typeof MASTER_STATUSES)[number]

export const PRODUCT_TYPES = ['PRODUCT', 'SPARE', 'TOOL'] as const
export type ProductType = (typeof PRODUCT_TYPES)[number]

export const ORDER_STATUSES = [
  'OPEN',
  'CLOSED',
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

// Piece-level identity status (ProductionSerial collection).
export const PRODUCTION_SERIAL_STATUSES = [
  'NOT_STARTED',
  'IN_PROGRESS',
  'ON_HOLD',
  'COMPLETED',
  'REWORK',
  'REJECTED',
  'SCRAPPED',
] as const
export type ProductionSerialStatus =
  (typeof PRODUCTION_SERIAL_STATUSES)[number]

// Per route-step execution status (SerialProcessExecution collection).
export const SERIAL_EXECUTION_STATUSES = [
  'NOT_STARTED',
  'IN_PROGRESS',
  'COMPLETED',
  'HOLD',
  'REWORK',
  'REJECTED',
] as const
export type SerialExecutionStatus =
  (typeof SERIAL_EXECUTION_STATUSES)[number]

// Quality state used across serials/executions/dispatch QA gates.
export const QUALITY_STATUSES = ['PENDING', 'PASSED', 'FAILED', 'HOLD'] as const
export type QualityStatus = (typeof QUALITY_STATUSES)[number]

// Capacity utilization band (MachineCapacityAllocation collection).
export const CAPACITY_STATUSES = [
  'HEALTHY',
  'NEAR_LIMIT',
  'OVERLOADED',
] as const
export type CapacityStatus = (typeof CAPACITY_STATUSES)[number]

// Machine maintenance type/state (MachineMaintenance collection).
export const MAINTENANCE_TYPES = ['PREVENTIVE', 'BREAKDOWN'] as const
export type MaintenanceType = (typeof MAINTENANCE_TYPES)[number]

export const MAINTENANCE_STATUSES = [
  'SCHEDULED',
  'ACTIVE',
  'COMPLETED',
] as const
export type MaintenanceStatus = (typeof MAINTENANCE_STATUSES)[number]

// Shift handover workflow state (ShiftHandover collection).
export const HANDOVER_STATUSES = [
  'DRAFT',
  'PENDING_ACKNOWLEDGMENT',
  'ACKNOWLEDGED',
  'CLOSED',
] as const
export type HandoverStatus = (typeof HANDOVER_STATUSES)[number]

// Incident workflow state (Incident collection).
export const INCIDENT_STATUSES = [
  'OPEN',
  'ACTIVE',
  'RESOLVED',
  'CLOSED',
] as const
export type IncidentStatus = (typeof INCIDENT_STATUSES)[number]

// Deviation approval workflow state (Deviation collection).
export const DEVIATION_STATUSES = [
  'PENDING_APPROVAL',
  'APPROVED',
  'REJECTED',
  'CLOSED',
] as const
export type DeviationStatus = (typeof DEVIATION_STATUSES)[number]

// Outbound dispatch state (Dispatch collection).
export const DISPATCH_STATUSES = [
  'READY',
  'DISPATCHED_IN_TRANSIT',
  'DELIVERED',
  'CANCELLED',
] as const
export type DispatchStatus = (typeof DISPATCH_STATUSES)[number]

// Invoice lifecycle state (Invoice collection).
export const INVOICE_STATUSES = ['ACTIVE', 'CANCELLED'] as const
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number]

// Dispatch evidence document type (DispatchDocument collection).
export const DISPATCH_DOCUMENT_TYPES = [
  'BOL',
  'INVOICE',
  'PACKING_LIST',
] as const
export type DispatchDocumentType = (typeof DISPATCH_DOCUMENT_TYPES)[number]

// Vehicle/trip state (Vehicle collection).
export const VEHICLE_STATUSES = [
  'ASSIGNED',
  'IN_TRANSIT',
  'DELIVERED',
] as const
export type VehicleStatus = (typeof VEHICLE_STATUSES)[number]

// Quality event type (QualityEvent collection — reserved).
export const QUALITY_EVENT_TYPES = ['REJECTION', 'SCRAP', 'REWORK'] as const
export type QualityEventType = (typeof QUALITY_EVENT_TYPES)[number]

// Generic audit action (AuditLog collection).
export const AUDIT_ACTIONS = [
  'CREATE',
  'UPDATE',
  'APPROVE',
  'STATUS_CHANGE',
] as const
export type AuditAction = (typeof AUDIT_ACTIONS)[number]
