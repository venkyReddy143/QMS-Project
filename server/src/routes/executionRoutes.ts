import { Router } from 'express'
import { makeCrud } from '../controllers/executionController'
import { requireAuth } from '../middleware/auth'

// Master / common
import { Shift } from '../models/Shift'
import { ReasonCode } from '../models/ReasonCode'
// Module 01 — Delivery Batch Scheduling
import { BatchAllocation } from '../models/BatchAllocation'
// Module 02 — Daily Progress & Shop Floor Capture
import { ProductionSerial } from '../models/ProductionSerial'
import { SerialProcessExecution } from '../models/SerialProcessExecution'
import { ShopFloorUpdate } from '../models/ShopFloorUpdate'
// Module 03 — Machine Capacity & Shift Planning
import { MachineCapacityAllocation } from '../models/MachineCapacityAllocation'
import { MachineMaintenance } from '../models/MachineMaintenance'
// Module 04 — Shift Handover & Deviation Log
import { ShiftHandover } from '../models/ShiftHandover'
import { HandoverSerialTransfer } from '../models/HandoverSerialTransfer'
import { Incident } from '../models/Incident'
import { Deviation } from '../models/Deviation'
// Module 05 — Dispatch Console
import { Dispatch } from '../models/Dispatch'
import { DispatchLine } from '../models/DispatchLine'
import { Invoice } from '../models/Invoice'
import { DispatchDocument } from '../models/DispatchDocument'
import { Vehicle } from '../models/Vehicle'
// Module 06 — Executive Dashboard
import { DashboardSnapshot } from '../models/DashboardSnapshot'
// Supporting
import { AuditLog } from '../models/AuditLog'
import { Notification } from '../models/Notification'

export const executionRoutes = Router()

executionRoutes.use(requireAuth)

/**
 * Each entry exposes:
 *   GET    /<path>       -> list (with simple ?field= filtering)
 *   GET    /<path>/:id   -> get by id
 *   POST   /<path>       -> save (create)
 */
const collections = [
  { path: 'shifts', model: Shift, label: 'Shift' },
  { path: 'reason-codes', model: ReasonCode, label: 'Reason code' },
  { path: 'batch-allocations', model: BatchAllocation, label: 'Batch allocation' },
  { path: 'serials', model: ProductionSerial, label: 'Production serial' },
  {
    path: 'serial-executions',
    model: SerialProcessExecution,
    label: 'Serial process execution',
  },
  { path: 'shop-floor-updates', model: ShopFloorUpdate, label: 'Shop floor update' },
  {
    path: 'capacity-allocations',
    model: MachineCapacityAllocation,
    label: 'Machine capacity allocation',
  },
  {
    path: 'machine-maintenance',
    model: MachineMaintenance,
    label: 'Machine maintenance',
  },
  { path: 'handovers', model: ShiftHandover, label: 'Shift handover' },
  {
    path: 'handover-transfers',
    model: HandoverSerialTransfer,
    label: 'Handover serial transfer',
  },
  { path: 'incidents', model: Incident, label: 'Incident' },
  { path: 'deviations', model: Deviation, label: 'Deviation' },
  { path: 'dispatches', model: Dispatch, label: 'Dispatch' },
  { path: 'dispatch-lines', model: DispatchLine, label: 'Dispatch line' },
  { path: 'invoices', model: Invoice, label: 'Invoice' },
  {
    path: 'dispatch-documents',
    model: DispatchDocument,
    label: 'Dispatch document',
  },
  { path: 'vehicles', model: Vehicle, label: 'Vehicle' },
  {
    path: 'dashboard-snapshots',
    model: DashboardSnapshot,
    label: 'Dashboard snapshot',
  },
  { path: 'audit-logs', model: AuditLog, label: 'Audit log' },
  { path: 'notifications', model: Notification, label: 'Notification' },
] as const

for (const { path, model, label } of collections) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handlers = makeCrud(model as any, label)
  executionRoutes.get(`/${path}`, handlers.list)
  executionRoutes.get(`/${path}/:id`, handlers.getOne)
  executionRoutes.post(`/${path}`, handlers.create)
}
