import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { buildBatchSerials, getSerialFormatExample } from '../lib/serialNumber'

export type OrderStatus =
  | 'Created'
  | 'Planned'
  | 'In Production'
  | 'On Hold'
  | 'Ready to Dispatch'

export type StepStatus =
  | 'Pending'
  | 'Assigned'
  | 'Running'
  | 'Pending Review'
  | 'Approved'
  | 'Rejected'

export type ShiftCode = 'A' | 'B' | 'C'
export type BatchStatus = 'Planned' | 'In Production' | 'Completed'
export type PieceSerialStatus =
  | 'Queued'
  | 'In Progress'
  | 'Completed'
  | 'Disputed'
  | 'Rejected'
export type DisputeStatus = 'Pending Manager Review' | 'Resolved'

export interface ProcessStepDef {
  id: string
  name: string
  hours: number
}

export interface PieceSerial {
  id: string
  serialNumber: string
  orderId: string
  batchId: string
  sequence: number
  status: PieceSerialStatus
  progressPercent: number
  currentStepId: string | null
  lastEmployeeId: string | null
  lastShift: ShiftCode | null
  lastUpdateNote: string | null
}

export interface OrderBatch {
  id: string
  batchNumber: number
  tag: string
  quantity: number
  status: BatchStatus
  serials: PieceSerial[]
}

export interface OrderStep {
  id: string
  name: string
  standardHours: number
  sequence: number
  status: StepStatus
}

export interface ManufacturingOrder {
  id: string
  customer: string
  product: string
  poNumber: string
  qty: number
  dueDate: string
  priority: 'Normal' | 'High' | 'Urgent'
  status: OrderStatus
  notes: string
  steps: OrderStep[]
  batches: OrderBatch[]
  startedBy: string | null
}

export interface Employee {
  id: string
  name: string
  skill: string
}

export interface Machine {
  id: string
  code: string
  name: string
}

export interface ProgressDispute {
  id: string
  orderId: string
  batchId: string
  serialId: string
  previousEmployeeId: string
  previousShift: ShiftCode
  previousPercent: number
  challengerEmployeeId: string
  challengerShift: ShiftCode
  challengerPercent: number
  challengerNote: string
  status: DisputeStatus
  managerFinalPercent: number | null
  managerNote: string | null
  resolvedBy: string | null
}

export interface ShiftProgressEntry {
  serialId: string
  progressPercent: number
  note: string
}

interface CreateOrderInput {
  customer: string
  product: string
  poNumber: string
  qty: number
  dueDate: string
  priority: 'Normal' | 'High' | 'Urgent'
  notes: string
  processSteps: ProcessStepDef[]
}

interface SubmitShiftProgressInput {
  orderId: string
  batchId: string
  employeeId: string
  shift: ShiftCode
  machineId: string
  entries: ShiftProgressEntry[]
}

interface RaiseDisputeInput {
  orderId: string
  batchId: string
  serialId: string
  challengerEmployeeId: string
  challengerShift: ShiftCode
  challengerPercent: number
  challengerNote: string
}

interface OrdersContextValue {
  orders: ManufacturingOrder[]
  employees: Employee[]
  machines: Machine[]
  disputes: ProgressDispute[]
  serialFormatExample: string
  getOrder: (id: string) => ManufacturingOrder | undefined
  createOrder: (input: CreateOrderInput) => string
  startOrder: (orderId: string, managerName: string) => { ok: boolean; message: string }
  createBatches: (
    orderId: string,
    quantities: number[],
  ) => { ok: boolean; message: string }
  submitShiftProgress: (
    input: SubmitShiftProgressInput,
  ) => { ok: boolean; message: string }
  raiseDispute: (input: RaiseDisputeInput) => { ok: boolean; message: string }
  resolveDispute: (
    disputeId: string,
    finalPercent: number,
    managerName: string,
    managerNote: string,
  ) => { ok: boolean; message: string }
  getAllocatedQty: (order: ManufacturingOrder) => number
  getPendingDisputes: () => ProgressDispute[]
  findSerial: (
    orderId: string,
    serialId: string,
  ) => { order: ManufacturingOrder; batch: OrderBatch; serial: PieceSerial } | null
}

const EMPLOYEES: Employee[] = [
  { id: 'emp-suresh', name: 'Suresh N.', skill: 'CNC / Multi-machine' },
  { id: 'emp-priya', name: 'Priya D.', skill: 'Casting / Furnace' },
  { id: 'emp-amit', name: 'Amit K.', skill: 'Coating / NDT' },
  { id: 'emp-farhan', name: 'Farhan S.', skill: 'Inspection / Packing' },
]

const MACHINES: Machine[] = [
  { id: 'mch-furn-01', code: 'FURN-01', name: 'Casting Furnace 01' },
  { id: 'mch-cnc-01', code: 'CNC-01', name: 'CNC Vertical Mill 01' },
  { id: 'mch-cnc-02', code: 'CNC-02', name: 'CNC Vertical Mill 02' },
  { id: 'mch-coat-01', code: 'COAT-01', name: 'Coating Line 01' },
  { id: 'mch-ndt-01', code: 'NDT-01', name: 'NDT Cell 01' },
]

function makeSteps(defs: ProcessStepDef[]): OrderStep[] {
  return defs.map((def, index) => ({
    id: def.id || `step-${index + 1}`,
    name: def.name,
    standardHours: def.hours,
    sequence: index + 1,
    status: 'Pending' as const,
  }))
}

function enrichSerials(
  orderId: string,
  batchId: string,
  batchNumber: number,
  quantity: number,
  startSequence: number,
): { serials: PieceSerial[]; nextSequence: number } {
  const built = buildBatchSerials({
    orderId,
    batchId,
    batchNumber,
    quantity,
    startSequence,
  })
  return {
    nextSequence: built.nextSequence,
    serials: built.serials.map((serial) => ({
      ...serial,
      status: 'Queued' as const,
      progressPercent: 0,
      currentStepId: null,
      lastEmployeeId: null,
      lastShift: null,
      lastUpdateNote: null,
    })),
  }
}

function createBatchesFromQuantities(
  orderId: string,
  quantities: number[],
): OrderBatch[] {
  let sequenceCursor = 1
  return quantities.map((quantity, index) => {
    const batchNumber = index + 1
    const batchId = `${orderId}-batch-${batchNumber}`
    const built = enrichSerials(
      orderId,
      batchId,
      batchNumber,
      quantity,
      sequenceCursor,
    )
    sequenceCursor = built.nextSequence
    return {
      id: batchId,
      batchNumber,
      tag: `Batch ${batchNumber}`,
      quantity,
      status: 'Planned' as const,
      serials: built.serials,
    }
  })
}

function seedOrders(): ManufacturingOrder[] {
  const bladeBatches = createBatchesFromQuantities('PO-2026-0041', [100, 200, 200])

  // Simulate Shift A progress on first few serials of Batch 1
  bladeBatches[0] = {
    ...bladeBatches[0],
    status: 'In Production',
    serials: bladeBatches[0].serials.map((serial, index) => {
      if (index < 3) {
        return {
          ...serial,
          status: 'Completed' as const,
          progressPercent: 100,
          lastEmployeeId: 'emp-suresh',
          lastShift: 'A' as const,
          lastUpdateNote: 'Completed in Shift A',
        }
      }
      if (index === 3) {
        return {
          ...serial,
          status: 'In Progress' as const,
          progressPercent: 40,
          lastEmployeeId: 'emp-suresh',
          lastShift: 'A' as const,
          lastUpdateNote: 'Shift A reported 40% complete',
        }
      }
      return serial
    }),
  }

  return [
    {
      id: 'PO-2026-0041',
      customer: 'AeroDyn Turbines Ltd.',
      product: 'HP Stage-1 Rotor Blade',
      poNumber: 'CUST-PO-8801',
      qty: 500,
      dueDate: '2026-09-30',
      priority: 'High',
      status: 'In Production',
      notes: 'Critical customer delivery',
      startedBy: 'Ananya Mehta',
      steps: makeSteps([
        { id: 's1', name: 'Casting', hours: 0.45 },
        { id: 's2', name: 'CNC Machining', hours: 2.5 },
        { id: 's3', name: 'Coating', hours: 0.8 },
        { id: 's4', name: 'NDT Testing', hours: 0.3 },
        { id: 's5', name: 'Final Inspection', hours: 0.2 },
        { id: 's6', name: 'Packing', hours: 0.15 },
      ]),
      batches: bladeBatches,
    },
    {
      id: 'PO-2026-0038',
      customer: 'Prime Aero Components',
      product: 'Compressor Blade Set',
      poNumber: 'PAC-2201',
      qty: 120,
      dueDate: '2026-09-12',
      priority: 'Normal',
      status: 'Planned',
      notes: '',
      startedBy: 'Ananya Mehta',
      steps: makeSteps([
        { id: 'c1', name: 'CNC Machining', hours: 1.2 },
        { id: 'c2', name: 'Coating', hours: 0.6 },
        { id: 'c3', name: 'NDT Testing', hours: 0.2 },
        { id: 'c4', name: 'Final Inspection', hours: 0.15 },
        { id: 'c5', name: 'Packing', hours: 0.1 },
      ]),
      batches: [],
    },
    {
      id: 'PO-2026-0032',
      customer: 'NorthWind Energy',
      product: 'LP Stage-2 Stator Vane',
      poNumber: 'NW-771',
      qty: 80,
      dueDate: '2026-08-28',
      priority: 'Urgent',
      status: 'Ready to Dispatch',
      notes: 'Ready for dispatch bay',
      startedBy: 'Ravi Kumar',
      steps: makeSteps([
        { id: 'v1', name: 'Casting', hours: 0.4 },
        { id: 'v2', name: 'CNC Machining', hours: 1.8 },
        { id: 'v3', name: 'NDT Testing', hours: 0.25 },
        { id: 'v4', name: 'Final Inspection', hours: 0.2 },
        { id: 'v5', name: 'Packing', hours: 0.15 },
      ]),
      batches: createBatchesFromQuantities('PO-2026-0032', [80]).map((batch) => ({
        ...batch,
        status: 'Completed' as const,
        serials: batch.serials.map((serial) => ({
          ...serial,
          status: 'Completed' as const,
          progressPercent: 100,
        })),
      })),
    },
  ]
}

const OrdersContext = createContext<OrdersContextValue | null>(null)

export function OrdersProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<ManufacturingOrder[]>(() => seedOrders())
  const [disputes, setDisputes] = useState<ProgressDispute[]>([
    {
      id: 'disp-1',
      orderId: 'PO-2026-0041',
      batchId: 'PO-2026-0041-batch-1',
      serialId: 'PO-2026-0041-batch-1-sn-4',
      previousEmployeeId: 'emp-suresh',
      previousShift: 'A',
      previousPercent: 40,
      challengerEmployeeId: 'emp-amit',
      challengerShift: 'B',
      challengerPercent: 20,
      challengerNote:
        'Checked on machine — finishing pass not started. Looks closer to 20%.',
      status: 'Pending Manager Review',
      managerFinalPercent: null,
      managerNote: null,
      resolvedBy: null,
    },
  ])

  const getOrder = useCallback(
    (id: string) => orders.find((order) => order.id === id),
    [orders],
  )

  const getAllocatedQty = useCallback((order: ManufacturingOrder) => {
    return order.batches.reduce((sum, batch) => sum + batch.quantity, 0)
  }, [])

  const findSerial = useCallback(
    (orderId: string, serialId: string) => {
      const order = orders.find((item) => item.id === orderId)
      if (!order) return null
      for (const batch of order.batches) {
        const serial = batch.serials.find((item) => item.id === serialId)
        if (serial) return { order, batch, serial }
      }
      return null
    },
    [orders],
  )

  const createOrder = useCallback((input: CreateOrderInput) => {
    const id = `MO-${new Date().getFullYear()}-${String(
      Math.floor(Math.random() * 9000) + 1000,
    )}`
    const order: ManufacturingOrder = {
      id,
      customer: input.customer,
      product: input.product,
      poNumber: input.poNumber,
      qty: input.qty,
      dueDate: input.dueDate,
      priority: input.priority,
      status: 'Created',
      notes: input.notes,
      startedBy: null,
      steps: makeSteps(input.processSteps),
      batches: [],
    }
    setOrders((current) => [order, ...current])
    return id
  }, [])

  const startOrder = useCallback((orderId: string, managerName: string) => {
    let ok = false
    let message = 'Unable to start order.'
    setOrders((current) =>
      current.map((order) => {
        if (order.id !== orderId) return order
        if (order.status === 'In Production') {
          message = 'Order is already in production.'
          return order
        }
        if (order.status === 'Ready to Dispatch') {
          message = 'Order is already ready to dispatch.'
          return order
        }
        ok = true
        message =
          'Order started. Next: divide into batches and generate serial numbers.'
        return { ...order, status: 'In Production', startedBy: managerName }
      }),
    )
    return { ok, message }
  }, [])

  const createBatches = useCallback((orderId: string, quantities: number[]) => {
    let ok = false
    let message = 'Unable to create batches.'
    setOrders((current) =>
      current.map((order) => {
        if (order.id !== orderId) return order
        if (quantities.some((qty) => !Number.isFinite(qty) || qty <= 0)) {
          message = 'Each batch quantity must be greater than zero.'
          return order
        }
        const total = quantities.reduce((sum, qty) => sum + qty, 0)
        if (total !== order.qty) {
          message = `Batch total (${total}) must equal order qty (${order.qty}).`
          return order
        }
        const hasProgress = order.batches.some((batch) =>
          batch.serials.some((serial) => serial.progressPercent > 0),
        )
        if (hasProgress) {
          message = 'Cannot rebuild batches after serial progress has started.'
          return order
        }
        ok = true
        const batches = createBatchesFromQuantities(orderId, quantities)
        message = `${batches.length} batches created with ${total} serial numbers. Multiple shifts/employees can work the same batch.`
        return { ...order, batches }
      }),
    )
    return { ok, message }
  }, [])

  const submitShiftProgress = useCallback((input: SubmitShiftProgressInput) => {
    if (input.entries.length === 0) {
      return { ok: false, message: 'Add at least one serial update.' }
    }
    if (
      input.entries.some(
        (entry) =>
          !Number.isFinite(entry.progressPercent) ||
          entry.progressPercent < 0 ||
          entry.progressPercent > 100,
      )
    ) {
      return { ok: false, message: 'Progress % must be between 0 and 100.' }
    }

    let ok = false
    let message = 'Unable to save shift progress.'
    let completedCount = 0
    let inProgressCount = 0

    setOrders((current) =>
      current.map((order) => {
        if (order.id !== input.orderId) return order
        const batch = order.batches.find((item) => item.id === input.batchId)
        if (!batch) {
          message = 'Batch not found.'
          return order
        }

        const entryMap = new Map(
          input.entries.map((entry) => [entry.serialId, entry]),
        )

        const nextSerials = batch.serials.map((serial) => {
          const entry = entryMap.get(serial.id)
          if (!entry) return serial

          // Disputed serials locked until manager resolves
          if (serial.status === 'Disputed') {
            return serial
          }

          if (entry.progressPercent >= 100) {
            completedCount += 1
            return {
              ...serial,
              status: 'Completed' as const,
              progressPercent: 100,
              lastEmployeeId: input.employeeId,
              lastShift: input.shift,
              lastUpdateNote: entry.note || 'Marked completed this shift',
            }
          }

          inProgressCount += 1
          return {
            ...serial,
            status: 'In Progress' as const,
            progressPercent: entry.progressPercent,
            lastEmployeeId: input.employeeId,
            lastShift: input.shift,
            lastUpdateNote:
              entry.note || `Shift ${input.shift} reported ${entry.progressPercent}%`,
          }
        })

        const allDone = nextSerials.every((serial) => serial.status === 'Completed')
        ok = true
        message = `Shift ${input.shift} update saved: ${completedCount} completed, ${inProgressCount} in progress.`

        return {
          ...order,
          batches: order.batches.map((item) =>
            item.id === batch.id
              ? {
                  ...item,
                  status: allDone ? ('Completed' as const) : ('In Production' as const),
                  serials: nextSerials,
                }
              : item,
          ),
        }
      }),
    )

    return { ok, message }
  }, [])

  const raiseDispute = useCallback((input: RaiseDisputeInput) => {
    const found = findSerial(input.orderId, input.serialId)
    if (!found) return { ok: false, message: 'Serial not found.' }

    const { serial } = found
    if (serial.status !== 'In Progress') {
      return {
        ok: false,
        message: 'Only in-progress serials can be disputed by the next shift.',
      }
    }
    if (!serial.lastEmployeeId || !serial.lastShift) {
      return { ok: false, message: 'No previous shift progress to dispute.' }
    }
    if (serial.lastEmployeeId === input.challengerEmployeeId) {
      return {
        ok: false,
        message: 'Same employee cannot dispute their own progress. Update normally instead.',
      }
    }
    if (input.challengerPercent < 0 || input.challengerPercent > 100) {
      return { ok: false, message: 'Suggested % must be between 0 and 100.' }
    }

    const existing = disputes.find(
      (item) =>
        item.serialId === input.serialId &&
        item.status === 'Pending Manager Review',
    )
    if (existing) {
      return { ok: false, message: 'This serial already has a pending manager review.' }
    }

    const dispute: ProgressDispute = {
      id: `disp-${crypto.randomUUID().slice(0, 8)}`,
      orderId: input.orderId,
      batchId: input.batchId,
      serialId: input.serialId,
      previousEmployeeId: serial.lastEmployeeId,
      previousShift: serial.lastShift,
      previousPercent: serial.progressPercent,
      challengerEmployeeId: input.challengerEmployeeId,
      challengerShift: input.challengerShift,
      challengerPercent: input.challengerPercent,
      challengerNote: input.challengerNote,
      status: 'Pending Manager Review',
      managerFinalPercent: null,
      managerNote: null,
      resolvedBy: null,
    }

    setDisputes((current) => [dispute, ...current])
    setOrders((current) =>
      current.map((order) => {
        if (order.id !== input.orderId) return order
        return {
          ...order,
          batches: order.batches.map((batch) =>
            batch.id !== input.batchId
              ? batch
              : {
                  ...batch,
                  serials: batch.serials.map((item) =>
                    item.id === input.serialId
                      ? {
                          ...item,
                          status: 'Disputed' as const,
                          lastUpdateNote: `Disputed by next shift (claimed ${input.challengerPercent}%). Waiting for Floor Manager.`,
                        }
                      : item,
                  ),
                },
          ),
        }
      }),
    )

    return {
      ok: true,
      message:
        'Dispute raised. Floor Manager will review and set the final progress %.',
    }
  }, [disputes, findSerial])

  const resolveDispute = useCallback(
    (
      disputeId: string,
      finalPercent: number,
      managerName: string,
      managerNote: string,
    ) => {
      if (!Number.isFinite(finalPercent) || finalPercent < 0 || finalPercent > 100) {
        return { ok: false, message: 'Final % must be between 0 and 100.' }
      }

      const dispute = disputes.find((item) => item.id === disputeId)
      if (!dispute || dispute.status !== 'Pending Manager Review') {
        return { ok: false, message: 'Dispute not found or already resolved.' }
      }

      setDisputes((current) =>
        current.map((item) =>
          item.id === disputeId
            ? {
                ...item,
                status: 'Resolved' as const,
                managerFinalPercent: finalPercent,
                managerNote: managerNote || 'Floor Manager final decision',
                resolvedBy: managerName,
              }
            : item,
        ),
      )

      setOrders((current) =>
        current.map((order) => {
          if (order.id !== dispute.orderId) return order
          return {
            ...order,
            batches: order.batches.map((batch) =>
              batch.id !== dispute.batchId
                ? batch
                : {
                    ...batch,
                    serials: batch.serials.map((serial) => {
                      if (serial.id !== dispute.serialId) return serial
                      if (finalPercent >= 100) {
                        return {
                          ...serial,
                          status: 'Completed' as const,
                          progressPercent: 100,
                          lastUpdateNote: `Manager final: 100%. ${managerNote}`.trim(),
                        }
                      }
                      return {
                        ...serial,
                        status: 'In Progress' as const,
                        progressPercent: finalPercent,
                        lastUpdateNote: `Manager final: ${finalPercent}%. ${managerNote}`.trim(),
                      }
                    }),
                  },
            ),
          }
        }),
      )

      return {
        ok: true,
        message: `Manager decision saved: final progress set to ${finalPercent}%.`,
      }
    },
    [disputes],
  )

  const getPendingDisputes = useCallback(
    () => disputes.filter((item) => item.status === 'Pending Manager Review'),
    [disputes],
  )

  const value = useMemo<OrdersContextValue>(
    () => ({
      orders,
      employees: EMPLOYEES,
      machines: MACHINES,
      disputes,
      serialFormatExample: getSerialFormatExample(),
      getOrder,
      createOrder,
      startOrder,
      createBatches,
      submitShiftProgress,
      raiseDispute,
      resolveDispute,
      getAllocatedQty,
      getPendingDisputes,
      findSerial,
    }),
    [
      orders,
      disputes,
      getOrder,
      createOrder,
      startOrder,
      createBatches,
      submitShiftProgress,
      raiseDispute,
      resolveDispute,
      getAllocatedQty,
      getPendingDisputes,
      findSerial,
    ],
  )

  return (
    <OrdersContext.Provider value={value}>{children}</OrdersContext.Provider>
  )
}

export function useOrders() {
  const context = useContext(OrdersContext)
  if (!context) {
    throw new Error('useOrders must be used within OrdersProvider')
  }
  return context
}

export function getEmployeeName(
  employees: Employee[],
  employeeId: string | null,
): string {
  if (!employeeId) return '—'
  return employees.find((item) => item.id === employeeId)?.name ?? '—'
}

export function getMachineCode(
  machines: Machine[],
  machineId: string | null,
): string {
  if (!machineId) return '—'
  return machines.find((item) => item.id === machineId)?.code ?? '—'
}

export function serialStatusClass(status: PieceSerialStatus): string {
  switch (status) {
    case 'Completed':
      return 'bg-emerald-100 text-emerald-800'
    case 'In Progress':
      return 'bg-sky-100 text-sky-800'
    case 'Disputed':
      return 'bg-amber-100 text-amber-800'
    case 'Rejected':
      return 'bg-red-100 text-danger'
    default:
      return 'bg-slate-100 text-slate-700'
  }
}
