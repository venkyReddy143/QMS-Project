import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, PlusCircle, Trash2, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { canPlanProduction } from '../types/auth'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import {
  fetchMachines,
  fetchProcessSteps,
  fetchProducts,
} from '../store/slices/mastersSlice'
import {
  clearOrderDetail,
  fetchOrder,
  updateOrderPlanning,
} from '../store/slices/ordersSlice'
import type { ProcessStepOption, ProductProcessStep } from '../types/masters'
import type { ProductionOrder } from '../types/orders'
import { OrderBatches } from './OrderBatches'

const fieldClass =
  'min-h-12 w-full rounded-xl border border-border bg-surface-muted px-3 text-base text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/20'

const labelClass = 'block text-sm font-bold text-foreground'

interface PlanStep {
  id: string
  name: string
  hours: number
  isCustom: boolean
  code?: string
  machineId: string
}

interface ProductPlan {
  productId: string
  machineId: string
  steps: PlanStep[]
  newStepId: string
  newStepHours: string
  customStepName: string
  customStepHours: string
}

function formatDate(value: string | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toISOString().slice(0, 10)
}

function statusLabel(status: string): string {
  switch (status) {
    case 'OPEN':
      return 'Open'
    case 'CLOSED':
      return 'Close'
    case 'DRAFT':
      return 'Draft'
    case 'RELEASED':
      return 'Created'
    case 'IN_PRODUCTION':
    case 'PARTIALLY_COMPLETED':
      return 'In Production'
    case 'COMPLETED':
      return 'Ready to Dispatch'
    case 'ON_HOLD':
      return 'On Hold'
    case 'CANCELLED':
      return 'Cancelled'
    default:
      return status
  }
}

function lineStatusLabel(status: string | undefined): string {
  switch (status) {
    case 'CLOSED':
      return 'Close'
    case 'IN_PRODUCTION':
      return 'In Production'
    case 'COMPLETED':
      return 'Completed'
    case 'ON_HOLD':
      return 'On Hold'
    case 'OPEN':
    default:
      return 'Open'
  }
}

function sourcingLabel(value: string | undefined): string {
  return value === 'CUSTOMER' ? 'Customer' : 'Company'
}

function priorityLabel(value: string | undefined): string {
  switch (value) {
    case 'CRITICAL':
    case 'URGENT':
      return 'Urgent'
    case 'HIGH':
      return 'High'
    case 'NORMAL':
      return 'Normal'
    default:
      return value || '—'
  }
}

function parseHours(value: string | undefined): number | null {
  const normalized = String(value ?? '').trim().replace(',', '.')
  if (normalized === '') return 0
  const hours = Number(normalized)
  if (!Number.isFinite(hours) || hours < 0) return null
  return hours
}

function machineLabel(machine: { machineCode: string; name: string }): string {
  return `${machine.machineCode} — ${machine.name}`
}

function stepId(): string {
  return `step-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function stepsFromMaster(
  defaults: ProductProcessStep[],
  masters: ProcessStepOption[],
): PlanStep[] {
  return defaults.map((step) => {
    const master =
      masters.find((item) => item.code === step.code) ??
      masters.find((item) => item.name.toLowerCase() === step.name.toLowerCase())

    return {
      id: master?.id ?? step.code ?? stepId(),
      name: master?.name ?? step.name,
      hours: step.hoursPerPiece || master?.standardHoursPerPiece || 0,
      isCustom: false,
      code: master?.code ?? step.code,
      machineId: '',
    }
  })
}

function isPlanningComplete(order: ProductionOrder): boolean {
  if (!order.customerName?.trim()) return false
  const products = order.products ?? []
  if (products.length === 0) return false
  return products.every((line) => {
    const steps = line.processSteps ?? []
    if (steps.length === 0) return false
    return steps.every((step) => Boolean(step.machineId || line.primaryMachineId))
  })
}

export function OrderDetail() {
  const { orderId = '' } = useParams()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { user } = useAuth()
  const canEdit = canPlanProduction(user?.role)

  const order = useAppSelector((state) => state.orders.current)
  const detailStatus = useAppSelector((state) => state.orders.detailStatus)
  const detailError = useAppSelector((state) => state.orders.detailError)
  const planningStatus = useAppSelector((state) => state.orders.planningStatus)
  const planningError = useAppSelector((state) => state.orders.planningError)

  const products = useAppSelector((state) => state.masters.products)
  const machines = useAppSelector((state) => state.masters.machines)
  const processStepMasters = useAppSelector((state) => state.masters.processSteps)
  const machinesStatus = useAppSelector((state) => state.masters.machinesStatus)
  const processStepsStatus = useAppSelector(
    (state) => state.masters.processStepsStatus,
  )

  const [customerName, setCustomerName] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [inChargeName, setInChargeName] = useState('')
  const [plans, setPlans] = useState<ProductPlan[]>([])
  const [formError, setFormError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [view, setView] = useState<'details' | 'batches'>('details')
  const [expandedProcessLine, setExpandedProcessLine] = useState<string | null>(null)
  const [detailLineId, setDetailLineId] = useState<string | null>(null)

  useEffect(() => {
    if (!orderId) return
    void dispatch(fetchOrder(orderId))
    if (canEdit) {
      void dispatch(fetchProducts())
      void dispatch(fetchMachines())
      void dispatch(fetchProcessSteps())
    }
    return () => {
      dispatch(clearOrderDetail())
    }
  }, [canEdit, dispatch, orderId])

  useEffect(() => {
    if (!order || !canEdit) return
    if (isPlanningComplete(order)) setView('batches')
  }, [canEdit, order?.id])

  useEffect(() => {
    if (!order) return
    setCustomerName(order.customerName ?? '')
    setOwnerName(order.ownerName ?? '')
    setInChargeName(order.inChargeName ?? '')
    setPlans(
      (order.products ?? []).map((line) => ({
        productId: line.productId,
        machineId: line.primaryMachineId ?? '',
        steps: (line.processSteps ?? []).map((step) => ({
          id: step.code ?? stepId(),
          name: step.name,
          hours: step.hoursPerPiece,
          isCustom: step.isCustom,
          code: step.code,
          machineId: step.machineId || line.primaryMachineId || '',
        })),
        newStepId: '',
        newStepHours: '0.50',
        customStepName: '',
        customStepHours: '0.50',
      })),
    )
  }, [order])

  useEffect(() => {
    if (products.length === 0) return
    setPlans((current) =>
      current.map((plan) => {
        if (plan.steps.length > 0) return plan
        const product = products.find((item) => item.id === plan.productId)
        return {
          ...plan,
          steps: stepsFromMaster(product?.processSteps ?? [], processStepMasters),
        }
      }),
    )
  }, [processStepMasters, products])

  function updatePlan(productId: string, patch: Partial<ProductPlan>) {
    setPlans((current) =>
      current.map((plan) =>
        plan.productId === productId ? { ...plan, ...patch } : plan,
      ),
    )
    setSaved(false)
  }

  function addStep(productId: string) {
    const plan = plans.find((item) => item.productId === productId)
    if (!plan) return
    const master = processStepMasters.find((item) => item.id === plan.newStepId)
    const hours = parseHours(plan.newStepHours)
    if (!master) {
      setFormError('Select a process step to add.')
      return
    }
    if (hours === null) {
      setFormError('Hours per piece cannot be negative.')
      return
    }
    if (plan.steps.some((step) => step.id === master.id || step.code === master.code)) {
      setFormError('That process step is already added.')
      return
    }

    setFormError(null)
    updatePlan(productId, {
      steps: [
        ...plan.steps,
        {
          id: master.id,
          name: master.name,
          hours,
          isCustom: false,
          code: master.code,
          machineId: '',
        },
      ],
      newStepId: '',
      newStepHours: '0.50',
    })
  }

  function addCustomStep(productId: string) {
    const plan = plans.find((item) => item.productId === productId)
    if (!plan) return
    const name = plan.customStepName.trim()
    const hours = parseHours(plan.customStepHours)
    if (!name) {
      setFormError('Enter a custom process step name.')
      return
    }
    if (hours === null) {
      setFormError('Hours per piece cannot be negative.')
      return
    }
    if (
      plan.steps.some(
        (step) => step.name.toLowerCase() === name.toLowerCase(),
      )
    ) {
      setFormError('That process step is already added.')
      return
    }

    setFormError(null)
    updatePlan(productId, {
      steps: [
        ...plan.steps,
        {
          id: stepId(),
          name,
          hours,
          isCustom: true,
          machineId: '',
        },
      ],
      customStepName: '',
      customStepHours: '0.50',
    })
  }

  function updateStepMachine(
    productId: string,
    stepKey: string,
    machineId: string,
  ) {
    const plan = plans.find((item) => item.productId === productId)
    if (!plan) return
    updatePlan(productId, {
      steps: plan.steps.map((step) =>
        step.id === stepKey ? { ...step, machineId } : step,
      ),
    })
  }

  function removeStep(productId: string, stepIdValue: string) {
    const plan = plans.find((item) => item.productId === productId)
    if (!plan) return
    updatePlan(productId, {
      steps: plan.steps.filter((step) => step.id !== stepIdValue),
    })
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault()
    if (!order) return
    setSaved(false)

    const line = (order.products ?? []).find(
      (item) => item.productId === expandedProcessLine,
    )
    const plan = plans.find((item) => item.productId === expandedProcessLine)
    if (!line || !plan) {
      setFormError('Open a product line before saving.')
      return
    }
    if (!plan.steps.length) {
      setFormError(`Add at least one process step for ${line.productName}.`)
      return
    }
    const missingMachine = plan.steps.find((step) => !step.machineId)
    if (missingMachine) {
      setFormError(
        `Select a machine for ${missingMachine.name} on ${line.productName}.`,
      )
      return
    }

    const savedCustomer = customerName.trim() || order.customerName?.trim() || ''
    if (!savedCustomer) {
      setFormError('Customer name is missing on this order.')
      return
    }

    setFormError(null)
    const result = await dispatch(
      updateOrderPlanning({
        orderId: order.id,
        payload: {
          customerName: savedCustomer,
          ownerName: ownerName.trim() || order.ownerName,
          inChargeName: inChargeName.trim() || order.inChargeName,
          products: [
            {
              productId: plan.productId,
              primaryMachineId:
                plan.steps.find((step) => step.machineId)?.machineId ?? '',
              drawingNumber: line.drawingNumber,
              remarks: line.remarks,
              rawMaterialSourcing:
                (line.rawMaterialSourcing as 'COMPANY' | 'CUSTOMER' | undefined) ??
                'COMPANY',
              processSteps: plan.steps.map((step) => ({
                name: step.name,
                hoursPerPiece: step.hours,
                isCustom: step.isCustom,
                machineId: step.machineId,
                ...(step.code ? { code: step.code } : {}),
              })),
            },
          ],
        },
      }),
    )

    if (updateOrderPlanning.fulfilled.match(result)) {
      setSaved(true)
      setExpandedProcessLine(null)
    }
  }

  if (detailStatus === 'loading' || detailStatus === 'idle') {
    return (
      <div className="rounded-2xl border border-border bg-surface-raised p-6 text-muted">
        Loading order…
      </div>
    )
  }

  if (!order) {
    return (
      <div className="rounded-2xl border border-border bg-surface-raised p-6">
        <p className="text-lg font-bold">Order not found</p>
        <p className="mt-1 text-sm text-muted">{detailError}</p>
        <button
          type="button"
          onClick={() => navigate('/orders')}
          className="mt-4 min-h-11 rounded-xl bg-accent px-4 font-bold text-white"
        >
          Back to Orders
        </button>
      </div>
    )
  }

  const productsOnOrder = order.products ?? []
  const detailLineIndex = productsOnOrder.findIndex(
    (line) => line.productId === detailLineId,
  )
  const detailLine =
    detailLineIndex >= 0 ? productsOnOrder[detailLineIndex] : null
  const planningReady = isPlanningComplete(order)
  const isSuperAdmin = user?.role === 'Super Admin'

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <button
        type="button"
        onClick={() => navigate('/orders')}
        className="inline-flex items-center gap-2 text-sm font-bold text-accent"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Orders
      </button>

      <section className="rounded-2xl border border-border bg-surface-raised p-5">
        <p className="text-sm font-semibold text-muted">
          {isSuperAdmin ? 'View Details' : 'Order'}
        </p>
        <h2 className="text-2xl font-bold text-foreground">{order.orderNo}</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-border bg-surface-muted p-3">
            <p className="text-xs font-semibold text-muted">Order ID</p>
            <p className="mt-1 font-bold">{order.orderNo}</p>
          </div>
          <div className="rounded-xl border border-border bg-surface-muted p-3">
            <p className="text-xs font-semibold text-muted">Order Date</p>
            <p className="mt-1 font-bold">
              {formatDate(order.orderDate || order.createdAt)}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-surface-muted p-3">
            <p className="text-xs font-semibold text-muted">Customer</p>
            <p className="mt-1 font-bold">{order.customerName || '—'}</p>
          </div>
          <div className="rounded-xl border border-border bg-surface-muted p-3">
            <p className="text-xs font-semibold text-muted">PO Ref</p>
            <p className="mt-1 font-bold">{order.customerPoRef || '—'}</p>
          </div>
          {isSuperAdmin ? (
            <>
              <div className="rounded-xl border border-border bg-surface-muted p-3">
                <p className="text-xs font-semibold text-muted">Owner</p>
                <p className="mt-1 font-bold">{order.ownerName || '—'}</p>
              </div>
              <div className="rounded-xl border border-border bg-surface-muted p-3">
                <p className="text-xs font-semibold text-muted">In Charge</p>
                <p className="mt-1 font-bold">{order.inChargeName || '—'}</p>
              </div>
              <div className="rounded-xl border border-border bg-surface-muted p-3">
                <p className="text-xs font-semibold text-muted">Remarks</p>
                <p className="mt-1 font-bold">{order.notes || '—'}</p>
              </div>
            </>
          ) : null}
          <div className="rounded-xl border border-border bg-surface-muted p-3">
            <p className="text-xs font-semibold text-muted">Status</p>
            <p className="mt-1 font-bold">{statusLabel(order.status)}</p>
          </div>
          <div className="rounded-xl border border-border bg-surface-muted p-3">
            <p className="text-xs font-semibold text-muted">Total Qty</p>
            <p className="mt-1 font-bold">{order.totalQuantity} pcs</p>
          </div>
          <div className="rounded-xl border border-border bg-surface-muted p-3">
            <p className="text-xs font-semibold text-muted">Due Date</p>
            <p className="mt-1 font-bold">{formatDate(order.dueDate)}</p>
          </div>
          <div className="rounded-xl border border-border bg-surface-muted p-3">
            <p className="text-xs font-semibold text-muted">Priority</p>
            <p className="mt-1 font-bold">{priorityLabel(order.priority)}</p>
          </div>
        </div>
      </section>

      {isSuperAdmin && view === 'details' ? (
        <section className="overflow-hidden rounded-2xl border border-border bg-surface-raised">
          <div className="border-b border-border px-5 py-4">
            <h3 className="text-lg font-bold">Order Lines</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-surface-muted text-xs font-bold uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3">Line</th>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Product Desc</th>
                  <th className="px-4 py-3">Drawing Ref</th>
                  <th className="px-4 py-3">Qty</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {productsOnOrder.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-muted">
                      No lines.
                    </td>
                  </tr>
                ) : (
                  productsOnOrder.map((line, index) => (
                    <tr key={`${line.productId}-${index}`} className="border-t border-border align-top">
                      <td className="px-4 py-3 font-semibold">
                        {line.lineNumber ?? index + 1}
                      </td>
                      <td className="px-4 py-3">{line.productName}</td>
                      <td className="px-4 py-3">{line.description || '—'}</td>
                      <td className="px-4 py-3">{line.drawingNumber || '—'}</td>
                      <td className="px-4 py-3">{line.quantity}</td>
                      <td className="px-4 py-3">{line.lineStatus || 'OPEN'}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setDetailLineId(line.productId)}
                            className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:border-accent"
                          >
                            View Order Line Details
                          </button>
                          <button
                            type="button"
                            onClick={() => setView('batches')}
                            className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:border-accent"
                          >
                            View Production Batch
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedProcessLine(
                                expandedProcessLine === line.productId
                                  ? null
                                  : line.productId,
                              )
                            }
                            className={`rounded-lg border px-3 py-1.5 text-xs font-bold hover:border-accent ${
                              expandedProcessLine === line.productId
                                ? 'border-accent bg-accent text-white'
                                : 'border-border'
                            }`}
                          >
                            View Process Steps
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {detailLine ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-4 sm:items-center"
          onClick={() => setDetailLineId(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="order-line-details-title"
            className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-2xl border border-border bg-surface-raised p-5 shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3
                  id="order-line-details-title"
                  className="text-lg font-bold text-foreground"
                >
                  Order Line Details
                </h3>
                <p className="text-sm text-muted">
                  Line {detailLine.lineNumber ?? detailLineIndex + 1} ·{' '}
                  {detailLine.productCode}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetailLineId(null)}
                className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-xl border border-border text-muted hover:text-foreground"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <p className={labelClass}>Product</p>
                <p className="rounded-xl border border-border bg-surface-muted px-3 py-3 text-base">
                  {detailLine.productName}
                </p>
              </div>
              <div className="space-y-1.5">
                <p className={labelClass}>Quantity</p>
                <p className="rounded-xl border border-border bg-surface-muted px-3 py-3 text-base">
                  {detailLine.quantity} {detailLine.uom.toLowerCase()}
                </p>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <p className={labelClass}>Product Details</p>
                <p className="min-h-16 whitespace-pre-wrap rounded-xl border border-border bg-surface-muted px-3 py-3 text-base">
                  {detailLine.description?.trim() || '—'}
                </p>
              </div>
              <div className="space-y-1.5">
                <p className={labelClass}>Drawing Number</p>
                <p className="rounded-xl border border-border bg-surface-muted px-3 py-3 text-base">
                  {detailLine.drawingNumber?.trim() || '—'}
                </p>
              </div>
              <div className="space-y-1.5">
                <p className={labelClass}>Raw Material Sourcing</p>
                <p className="rounded-xl border border-border bg-surface-muted px-3 py-3 text-base">
                  {sourcingLabel(detailLine.rawMaterialSourcing)}
                </p>
              </div>
              <div className="space-y-1.5">
                <p className={labelClass}>Status</p>
                <p className="rounded-xl border border-border bg-surface-muted px-3 py-3 text-base">
                  {lineStatusLabel(detailLine.lineStatus)}
                </p>
              </div>
              <div className="space-y-1.5">
                <p className={labelClass}>Line Remarks</p>
                <p className="rounded-xl border border-border bg-surface-muted px-3 py-3 text-base">
                  {detailLine.remarks?.trim() || '—'}
                </p>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setDetailLineId(null)}
                className="min-h-12 rounded-xl border border-border px-6 text-base font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {canEdit ? (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setView('details')}
            className={`min-h-11 rounded-xl px-4 text-sm font-bold ${
              view === 'details'
                ? 'bg-accent text-white'
                : 'border border-border bg-surface-muted'
            }`}
          >
            Order Details
          </button>
          <button
            type="button"
            onClick={() => setView('batches')}
            disabled={!isSuperAdmin && !planningReady}
            className={`min-h-11 rounded-xl px-4 text-sm font-bold ${
              view === 'batches'
                ? 'bg-accent text-white'
                : 'border border-border bg-surface-muted'
            } disabled:opacity-50`}
          >
            Batches
          </button>
        </div>
      ) : null}

      {view === 'batches' ? (
        <OrderBatches order={order} canEdit={canEdit} />
      ) : canEdit ? (
        <form onSubmit={handleSave} className="space-y-4">
          {productsOnOrder
            .filter((line) => expandedProcessLine === line.productId)
            .map((line) => {
            const plan = plans.find((item) => item.productId === line.productId)
            const usedCodes = new Set(
              (plan?.steps ?? []).map((step) => step.code ?? step.id),
            )
            const availableSteps = processStepMasters.filter(
              (item) => !usedCodes.has(item.code) && !usedCodes.has(item.id),
            )

            const lineNumber =
              line.lineNumber ??
              productsOnOrder.findIndex((item) => item.productId === line.productId) +
                1

            return (
              <section
                key={line.productId}
                className="rounded-2xl border border-border bg-surface-raised p-5"
              >
                <h3 className="text-lg font-bold text-foreground">
                  Product {lineNumber}: {line.productName}
                </h3>
                <p className="mt-1 text-sm text-muted">
                  {line.productCode} · {line.quantity} {line.uom.toLowerCase()}
                </p>
                {line.description ? (
                  <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">
                    {line.description}
                  </p>
                ) : null}

                <div className="mt-4">
                  <span className={labelClass}>Process Steps</span>
                  <ol className="mt-2 space-y-2">
                    {(plan?.steps ?? []).length === 0 ? (
                      <li className="rounded-xl bg-surface-muted px-3 py-3 text-sm text-muted">
                        No process steps yet.
                      </li>
                    ) : (
                      (plan?.steps ?? []).map((step, stepIndex) => (
                        <li
                          key={step.id}
                          className="flex min-h-12 flex-wrap items-center gap-3 rounded-xl border border-border bg-surface-muted px-3 py-2"
                        >
                          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-white">
                            {stepIndex + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold">
                              {step.name}
                              {step.isCustom ? (
                                <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-warning">
                                  Custom
                                </span>
                              ) : null}
                            </p>
                            <p className="text-sm text-muted">
                              {step.hours.toFixed(2)}h / pc
                            </p>
                          </div>
                          <select
                            value={step.machineId}
                            onChange={(event) =>
                              updateStepMachine(
                                line.productId,
                                step.id,
                                event.target.value,
                              )
                            }
                            disabled={machinesStatus === 'loading'}
                            aria-label={`Machine for ${step.name}`}
                            className="min-h-10 min-w-[14rem] flex-1 rounded-lg border border-border bg-surface-raised px-3 text-sm outline-none focus:border-accent"
                          >
                            <option value="">
                              {machinesStatus === 'loading'
                                ? 'Loading machines…'
                                : 'Select machine'}
                            </option>
                            {machines.map((machine) => (
                              <option key={machine.id} value={machine.id}>
                                {machineLabel(machine)}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => removeStep(line.productId, step.id)}
                            className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg border border-border bg-surface-raised text-muted hover:border-danger hover:text-danger"
                            aria-label={`Remove ${step.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </li>
                      ))
                    )}
                  </ol>

                  <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_120px_auto]">
                    <select
                      value={plan?.newStepId ?? ''}
                      onChange={(event) => {
                        const nextId = event.target.value
                        const master = processStepMasters.find(
                          (item) => item.id === nextId,
                        )
                        updatePlan(line.productId, {
                          newStepId: nextId,
                          newStepHours: master
                            ? String(master.standardHoursPerPiece)
                            : plan?.newStepHours ?? '0.50',
                        })
                      }}
                      disabled={
                        processStepsStatus === 'loading' ||
                        availableSteps.length === 0
                      }
                      className={fieldClass}
                    >
                      {processStepsStatus === 'loading' ? (
                        <option value="">Loading process steps…</option>
                      ) : availableSteps.length === 0 ? (
                        <option value="">All steps added</option>
                      ) : (
                        <>
                          <option value="">Select a process step</option>
                          {availableSteps.map((step) => (
                            <option key={step.id} value={step.id}>
                              {step.name}
                            </option>
                          ))}
                        </>
                      )}
                    </select>
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={plan?.newStepHours ?? '0.50'}
                      onChange={(event) =>
                        updatePlan(line.productId, {
                          newStepHours: event.target.value,
                        })
                      }
                      className={fieldClass}
                    />
                    <button
                      type="button"
                      onClick={() => addStep(line.productId)}
                      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-foreground px-4 text-sm font-bold text-white"
                    >
                      <PlusCircle className="h-4 w-4" />
                      Add
                    </button>
                  </div>

                  <div className="mt-3 rounded-xl border border-dashed border-border bg-surface-muted/50 p-3">
                    <p className="mb-2 text-sm font-bold text-foreground">
                      Custom process step
                    </p>
                    <div className="grid gap-3 sm:grid-cols-[1fr_120px_auto]">
                      <input
                        value={plan?.customStepName ?? ''}
                        onChange={(event) =>
                          updatePlan(line.productId, {
                            customStepName: event.target.value,
                          })
                        }
                        placeholder="Step name"
                        className={fieldClass}
                      />
                      <input
                        type="number"
                        min={0}
                        step="any"
                        value={plan?.customStepHours ?? '0.50'}
                        onChange={(event) =>
                          updatePlan(line.productId, {
                            customStepHours: event.target.value,
                          })
                        }
                        className={fieldClass}
                      />
                      <button
                        type="button"
                        onClick={() => addCustomStep(line.productId)}
                        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border bg-surface-raised px-4 text-sm font-bold text-foreground hover:border-accent hover:text-accent"
                      >
                        <PlusCircle className="h-4 w-4" />
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              </section>
            )
          })}

          {expandedProcessLine && (formError || planningError) ? (
            <div className="rounded-xl border border-danger/30 bg-red-50 px-4 py-3 text-sm font-medium text-danger">
              {formError || planningError}
            </div>
          ) : null}
          {expandedProcessLine && saved ? (
            <div className="rounded-xl border border-accent/30 bg-accent-soft px-4 py-3 text-sm font-semibold text-accent">
              Process steps saved for this line.
            </div>
          ) : null}

          {expandedProcessLine ? (
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={planningStatus === 'loading'}
                className="min-h-12 rounded-xl bg-accent px-8 text-base font-bold text-white hover:brightness-110 disabled:opacity-70"
              >
                {planningStatus === 'loading' ? 'Saving…' : 'Save'}
              </button>
            </div>
          ) : null}
        </form>
      ) : (
        <>
          {productsOnOrder.map((line) => (
            <section
              key={line.productId}
              className="rounded-2xl border border-border bg-surface-raised p-5"
            >
              <h3 className="text-lg font-bold text-foreground">
                {line.productName}
              </h3>
              <p className="mt-1 text-sm text-muted">
                {line.productCode} · {line.quantity} {line.uom.toLowerCase()}
              </p>
              {line.description ? (
                <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">
                  {line.description}
                </p>
              ) : null}
              <p className="mt-2 text-sm font-bold">Process steps</p>
              {(line.processSteps ?? []).length === 0 ? (
                <p className="mt-1 text-sm text-muted">Not added yet</p>
              ) : (
                <ol className="mt-2 space-y-1 text-sm">
                  {(line.processSteps ?? []).map((step, stepIndex) => (
                    <li key={`${step.name}-${stepIndex}`}>
                      {stepIndex + 1}. {step.name} ({step.hoursPerPiece.toFixed(2)}
                      h / pc)
                      {step.machineCode || step.machineName
                        ? ` · ${step.machineCode || step.machineName}`
                        : ' · No machine'}
                      {step.isCustom ? ' · Custom' : ''}
                    </li>
                  ))}
                </ol>
              )}
            </section>
          ))}
        </>
      )}
    </div>
  )
}
