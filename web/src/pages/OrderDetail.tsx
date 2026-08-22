import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, PlusCircle, Trash2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import {
  fetchCustomers,
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
    }
  })
}

function isPlanningComplete(order: ProductionOrder): boolean {
  if (!order.customerName?.trim()) return false
  const products = order.products ?? []
  if (products.length === 0) return false
  return products.every(
    (line) =>
      Boolean(line.primaryMachineId || line.primaryMachineType) &&
      (line.processSteps?.length ?? 0) > 0,
  )
}

export function OrderDetail() {
  const { orderId = '' } = useParams()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { user } = useAuth()
  const canEdit =
    user?.role === 'Production Manager' || user?.role === 'Floor Manager'

  const order = useAppSelector((state) => state.orders.current)
  const detailStatus = useAppSelector((state) => state.orders.detailStatus)
  const detailError = useAppSelector((state) => state.orders.detailError)
  const planningStatus = useAppSelector((state) => state.orders.planningStatus)
  const planningError = useAppSelector((state) => state.orders.planningError)

  const customers = useAppSelector((state) => state.masters.customers)
  const products = useAppSelector((state) => state.masters.products)
  const machines = useAppSelector((state) => state.masters.machines)
  const processStepMasters = useAppSelector((state) => state.masters.processSteps)
  const customersStatus = useAppSelector((state) => state.masters.customersStatus)
  const machinesStatus = useAppSelector((state) => state.masters.machinesStatus)
  const processStepsStatus = useAppSelector(
    (state) => state.masters.processStepsStatus,
  )

  const [customerName, setCustomerName] = useState('')
  const [plans, setPlans] = useState<ProductPlan[]>([])
  const [formError, setFormError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [view, setView] = useState<'details' | 'batches'>('details')

  useEffect(() => {
    if (!orderId) return
    void dispatch(fetchOrder(orderId))
    if (canEdit) {
      void dispatch(fetchCustomers())
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
        },
      ],
      customStepName: '',
      customStepHours: '0.50',
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

    if (!customerName.trim()) {
      setFormError('Select a customer.')
      return
    }

    for (const line of order.products ?? []) {
      const plan = plans.find((item) => item.productId === line.productId)
      if (!plan?.machineId) {
        setFormError(`Select a machine for ${line.productName}.`)
        return
      }
      if (!plan.steps.length) {
        setFormError(`Add at least one process step for ${line.productName}.`)
        return
      }
    }

    setFormError(null)
    const result = await dispatch(
      updateOrderPlanning({
        orderId: order.id,
        payload: {
          customerName: customerName.trim(),
          products: plans.map((plan) => ({
            productId: plan.productId,
            primaryMachineId: plan.machineId,
            processSteps: plan.steps.map((step) => ({
              name: step.name,
              hoursPerPiece: step.hours,
              isCustom: step.isCustom,
              ...(step.code ? { code: step.code } : {}),
            })),
          })),
        },
      }),
    )

    if (updateOrderPlanning.fulfilled.match(result)) {
      setSaved(true)
      setView('batches')
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
  const planningReady = isPlanningComplete(order)

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <button
        type="button"
        onClick={() => navigate('/orders')}
        className="inline-flex items-center gap-2 text-sm font-bold text-accent"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Orders
      </button>

      <section className="rounded-2xl border border-border bg-surface-raised p-5">
        <p className="text-sm font-semibold text-muted">Order</p>
        <h2 className="text-2xl font-bold text-foreground">{order.orderNo}</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
            disabled={!planningReady}
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
          <section className="rounded-2xl border border-border bg-surface-raised p-5">
            <h3 className="mb-4 text-lg font-bold text-foreground">Customer</h3>
            <label className="block space-y-1.5">
              <span className={labelClass}>Customer Name</span>
              <select
                value={customerName}
                onChange={(event) => {
                  setCustomerName(event.target.value)
                  setSaved(false)
                }}
                disabled={customersStatus === 'loading'}
                className={fieldClass}
              >
                <option value="">
                  {customersStatus === 'loading'
                    ? 'Loading customers…'
                    : 'Select customer'}
                </option>
                {customerName &&
                !customers.some((item) => item.name === customerName) ? (
                  <option value={customerName}>{customerName}</option>
                ) : null}
                {customers.map((item) => (
                  <option key={item.id} value={item.name}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          </section>

          {productsOnOrder.map((line, index) => {
            const plan = plans.find((item) => item.productId === line.productId)
            const usedCodes = new Set(
              (plan?.steps ?? []).map((step) => step.code ?? step.id),
            )
            const availableSteps = processStepMasters.filter(
              (item) => !usedCodes.has(item.code) && !usedCodes.has(item.id),
            )

            return (
              <section
                key={line.productId}
                className="rounded-2xl border border-border bg-surface-raised p-5"
              >
                <h3 className="text-lg font-bold text-foreground">
                  Product {index + 1}: {line.productName}
                </h3>
                <p className="mt-1 text-sm text-muted">
                  {line.productCode} · {line.quantity} {line.uom.toLowerCase()}
                </p>

                <label className="mt-4 block space-y-1.5">
                  <span className={labelClass}>Machine</span>
                  <select
                    value={plan?.machineId ?? ''}
                    onChange={(event) =>
                      updatePlan(line.productId, { machineId: event.target.value })
                    }
                    disabled={machinesStatus === 'loading'}
                    className={fieldClass}
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
                </label>

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
                          className="flex min-h-12 items-center gap-3 rounded-xl border border-border bg-surface-muted px-3"
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

          {formError || planningError ? (
            <div className="rounded-xl border border-danger/30 bg-red-50 px-4 py-3 text-sm font-medium text-danger">
              {formError || planningError}
            </div>
          ) : null}
          {saved ? (
            <div className="rounded-xl border border-accent/30 bg-accent-soft px-4 py-3 text-sm font-semibold text-accent">
              Order details saved.
            </div>
          ) : null}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={planningStatus === 'loading'}
              className="min-h-12 rounded-xl bg-accent px-8 text-base font-bold text-white hover:brightness-110 disabled:opacity-70"
            >
              {planningStatus === 'loading' ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      ) : (
        <>
          <section className="rounded-2xl border border-border bg-surface-raised p-5">
            <h3 className="text-lg font-bold text-foreground">Customer</h3>
            <p className="mt-2 text-base">
              {order.customerName || 'Not added yet'}
            </p>
          </section>
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
              <p className="mt-3 text-sm">
                <span className="font-bold">Machine: </span>
                {line.primaryMachineType || 'Not added yet'}
              </p>
              <p className="mt-2 text-sm font-bold">Process steps</p>
              {(line.processSteps ?? []).length === 0 ? (
                <p className="mt-1 text-sm text-muted">Not added yet</p>
              ) : (
                <ol className="mt-2 space-y-1 text-sm">
                  {(line.processSteps ?? []).map((step, stepIndex) => (
                    <li key={`${step.name}-${stepIndex}`}>
                      {stepIndex + 1}. {step.name} ({step.hoursPerPiece.toFixed(2)}
                      h / pc)
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
