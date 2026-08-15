import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { CheckCircle2, PlusCircle, Trash2 } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import {
  fetchCustomers,
  fetchMachines,
  fetchProcessSteps,
  fetchProducts,
} from '../store/slices/mastersSlice'
import { clearCreateOrderState, createOrder } from '../store/slices/ordersSlice'
import type { ProcessStepOption, ProductProcessStep } from '../types/masters'
import type { CreateOrderPayload, OrderPriorityApi } from '../types/orders'

type Priority = 'Normal' | 'High' | 'Urgent'

interface ProcessStep {
  id: string
  name: string
  hours: number
  isCustom: boolean
  code?: string
}

function buildStepsFromProduct(
  steps: ProductProcessStep[],
  masters: ProcessStepOption[],
): ProcessStep[] {
  return steps.map((step, index) => {
    const master =
      masters.find((item) => item.code === step.code) ??
      masters.find(
        (item) => item.name.toLowerCase() === step.name.toLowerCase(),
      )

    return {
      id: master?.id ?? step.code ?? `step-${index + 1}-${step.name}`,
      name: master?.name ?? step.name,
      hours: step.hoursPerPiece || master?.standardHoursPerPiece || 0,
      isCustom: false,
      code: master?.code ?? step.code,
    }
  })
}

function machineLabel(machine: { machineCode: string; name: string }): string {
  return `${machine.machineCode} — ${machine.name}`
}

const fieldClass =
  'min-h-12 w-full rounded-xl border border-border bg-surface-muted px-3 text-base text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/20'

const labelClass = 'block text-sm font-bold text-foreground'

function SectionCard({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section className="rounded-2xl border border-border bg-surface-raised p-5">
      <h3 className="mb-4 border-b border-border pb-3 text-lg font-bold text-foreground">
        {title}
      </h3>
      <div className="space-y-4">{children}</div>
    </section>
  )
}

function formatInr(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value)
}

type FieldErrors = {
  customer?: string
  productId?: string
  poNumber?: string
  quantity?: string
  budget?: string
  estimationPrice?: string
  primaryMachineId?: string
  processSteps?: string
  targetDate?: string
}

const PRIORITY_API: Record<Priority, OrderPriorityApi> = {
  Normal: 'NORMAL',
  High: 'HIGH',
  Urgent: 'URGENT',
}

function todayIsoDate(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

export function CreateOrder() {
  const dispatch = useAppDispatch()
  const customers = useAppSelector((state) => state.masters.customers)
  const products = useAppSelector((state) => state.masters.products)
  const processStepMasters = useAppSelector((state) => state.masters.processSteps)
  const machines = useAppSelector((state) => state.masters.machines)
  const customersStatus = useAppSelector((state) => state.masters.customersStatus)
  const productsStatus = useAppSelector((state) => state.masters.productsStatus)
  const processStepsStatus = useAppSelector(
    (state) => state.masters.processStepsStatus,
  )
  const machinesStatus = useAppSelector((state) => state.masters.machinesStatus)
  const customersError = useAppSelector((state) => state.masters.customersError)
  const productsError = useAppSelector((state) => state.masters.productsError)
  const processStepsError = useAppSelector(
    (state) => state.masters.processStepsError,
  )
  const machinesError = useAppSelector((state) => state.masters.machinesError)
  const createStatus = useAppSelector((state) => state.orders.createStatus)
  const createError = useAppSelector((state) => state.orders.createError)
  const lastCreated = useAppSelector((state) => state.orders.lastCreated)

  const [customer, setCustomer] = useState('')
  const [customerQuery, setCustomerQuery] = useState('')
  const [productId, setProductId] = useState('')
  const [poNumber, setPoNumber] = useState('')
  const [quantity, setQuantity] = useState('100')
  const [budget, setBudget] = useState('')
  const [estimationManual, setEstimationManual] = useState(false)
  const [estimationPrice, setEstimationPrice] = useState('')
  const [primaryMachineId, setPrimaryMachineId] = useState('')
  const [additionalMachineIds, setAdditionalMachineIds] = useState<string[]>([])
  const [targetDate, setTargetDate] = useState('2026-09-30')
  const [priority, setPriority] = useState<Priority>('Normal')
  const [notes, setNotes] = useState('')
  const [processSteps, setProcessSteps] = useState<ProcessStep[]>([])
  const [newStepId, setNewStepId] = useState('')
  const [newStepHours, setNewStepHours] = useState('0.50')
  const [stepError, setStepError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  const customerNames = useMemo(
    () => customers.map((item) => item.name),
    [customers],
  )
  const selectedProduct = useMemo(
    () => products.find((item) => item.id === productId) ?? null,
    [products, productId],
  )
  const selectedPrimaryMachine = useMemo(
    () => machines.find((item) => item.id === primaryMachineId) ?? null,
    [machines, primaryMachineId],
  )
  const unitRate = selectedProduct?.unitRate ?? 0

  useEffect(() => {
    void dispatch(fetchCustomers())
    void dispatch(fetchProducts())
    void dispatch(fetchProcessSteps())
    void dispatch(fetchMachines())
  }, [dispatch])

  useEffect(() => {
    if (products.length === 0) return
    const current = products.find((item) => item.id === productId)
    if (current) return
    const first = products[0]
    setProductId(first.id)
    setProcessSteps(buildStepsFromProduct(first.processSteps, processStepMasters))
  }, [products, productId, processStepMasters])

  useEffect(() => {
    if (machines.length === 0) return
    if (machines.some((item) => item.id === primaryMachineId)) return
    setPrimaryMachineId(machines[0].id)
    setAdditionalMachineIds([])
  }, [machines, primaryMachineId])

  const filteredCustomers = useMemo(() => {
    const q = customerQuery.trim().toLowerCase()
    if (!q) return customerNames
    return customerNames.filter((name) => name.toLowerCase().includes(q))
  }, [customerNames, customerQuery])

  const availableProcessSteps = useMemo(
    () =>
      processStepMasters.filter(
        (item) =>
          !processSteps.some(
            (step) => step.id === item.id || step.code === item.code,
          ),
      ),
    [processStepMasters, processSteps],
  )
  const additionalMachineOptions = useMemo(
    () => machines.filter((item) => item.id !== primaryMachineId),
    [machines, primaryMachineId],
  )

  const calculatedEstimate = useMemo(() => {
    const qty = Number(quantity) || 0
    return qty * unitRate
  }, [quantity, unitRate])

  const displayEstimate = estimationManual
    ? Number(estimationPrice) || 0
    : calculatedEstimate

  function applyProductDefaults(nextProductId: string) {
    const next = products.find((item) => item.id === nextProductId)
    if (!next) return
    setProductId(next.id)
    setEstimationManual(false)
    setProcessSteps(buildStepsFromProduct(next.processSteps, processStepMasters))
    setStepError(null)
  }

  function addCustomStep() {
    const master = processStepMasters.find((item) => item.id === newStepId)
    const hours = Number(newStepHours)

    if (!master) {
      setStepError('Select a process step.')
      return
    }
    if (!Number.isFinite(hours) || hours <= 0) {
      setStepError('Hours per piece must be greater than 0.')
      return
    }

    setProcessSteps((current) => [
      ...current,
      {
        id: master.id,
        name: master.name,
        hours,
        isCustom: true,
        code: master.code,
      },
    ])
    setNewStepId('')
    setNewStepHours('0.50')
    setStepError(null)
  }

  function removeStep(id: string) {
    setProcessSteps((current) => current.filter((step) => step.id !== id))
  }

  function toggleAdditionalMachine(machineId: string) {
    setAdditionalMachineIds((current) =>
      current.includes(machineId)
        ? current.filter((item) => item !== machineId)
        : [...current, machineId],
    )
  }

  function resetForm() {
    const first = products[0]
    setCustomer('')
    setCustomerQuery('')
    setProductId(first?.id ?? '')
    setPoNumber('')
    setQuantity('100')
    setBudget('')
    setEstimationManual(false)
    setEstimationPrice('')
    setPrimaryMachineId(machines[0]?.id ?? '')
    setAdditionalMachineIds([])
    setTargetDate('2026-09-30')
    setPriority('Normal')
    setNotes('')
    setProcessSteps(
      first
        ? buildStepsFromProduct(first.processSteps, processStepMasters)
        : processStepMasters.map((step) => ({
            id: step.id,
            name: step.name,
            hours: step.standardHoursPerPiece,
            isCustom: false,
            code: step.code,
          })),
    )
    setNewStepId('')
    setNewStepHours('0.50')
    setStepError(null)
    setFieldErrors({})
    dispatch(clearCreateOrderState())
  }

  function validateForm(): FieldErrors {
    const errors: FieldErrors = {}
    const qty = Number(quantity)
    const budgetValue = budget === '' ? undefined : Number(budget)
    const estimate = displayEstimate

    if (!customer || !customerNames.includes(customer)) {
      errors.customer = 'Select a customer from the list.'
    }
    if (!productId || !selectedProduct) {
      errors.productId = 'Select a product.'
    }
    if (!poNumber.trim()) {
      errors.poNumber = 'Order reference / PO number is required.'
    }
    if (!Number.isInteger(qty) || qty < 1) {
      errors.quantity = 'Total quantity must be a whole number of at least 1.'
    }
    if (budget !== '' && (!Number.isFinite(budgetValue) || (budgetValue ?? 0) < 0)) {
      errors.budget = 'Budget must be 0 or greater.'
    }
    if (!Number.isFinite(estimate) || estimate < 0) {
      errors.estimationPrice = 'Estimation price is required and must be 0 or greater.'
    }
    if (!primaryMachineId || !selectedPrimaryMachine) {
      errors.primaryMachineId = 'Select a primary machine.'
    }
    if (processSteps.length === 0) {
      errors.processSteps = 'Add at least one process step.'
    } else if (processSteps.some((step) => !step.name.trim() || step.hours <= 0)) {
      errors.processSteps = 'Each process step needs a name and hours greater than 0.'
    }
    if (!targetDate) {
      errors.targetDate = 'Target completion date is required.'
    } else if (Number.isNaN(new Date(targetDate).getTime())) {
      errors.targetDate = 'Enter a valid target completion date.'
    } else if (targetDate < todayIsoDate()) {
      errors.targetDate = 'Target completion date cannot be in the past.'
    }

    return errors
  }

  function buildPayload(): CreateOrderPayload | null {
    if (!selectedProduct || !selectedPrimaryMachine) return null

    const additionalMachineTypes = [
      ...new Set(
        additionalMachineIds
          .map((id) => machines.find((item) => item.id === id)?.machineType)
          .filter((type): type is string => Boolean(type))
          .filter((type) => type !== selectedPrimaryMachine.machineType),
      ),
    ]

    const payload: CreateOrderPayload = {
      customerName: customer.trim(),
      productId: selectedProduct.id,
      customerPoRef: poNumber.trim(),
      totalQuantity: Number(quantity),
      estimationPrice: displayEstimate,
      primaryMachineType: selectedPrimaryMachine.machineType,
      additionalMachineTypes,
      processSteps: processSteps.map((step) => ({
        name: step.name,
        hoursPerPiece: step.hours,
        isCustom: step.isCustom,
        ...(step.code ? { code: step.code } : {}),
      })),
      dueDate: targetDate,
      priority: PRIORITY_API[priority],
      notes: notes.trim(),
    }

    if (budget !== '') {
      payload.budget = Number(budget)
    }

    return payload
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const errors = validateForm()
    setFieldErrors(errors)
    if (errors.processSteps) {
      setStepError(errors.processSteps)
    }

    if (Object.keys(errors).length > 0) return

    const payload = buildPayload()
    if (!payload) return

    try {
      await dispatch(createOrder(payload)).unwrap()
    } catch {
      return
    }
  }

  if (lastCreated) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl border border-success/30 bg-emerald-50 p-6 text-center sm:p-8">
          <CheckCircle2 className="mx-auto h-14 w-14 text-success" />
          <h2 className="mt-4 text-2xl font-bold text-foreground">
            Order Created Successfully
          </h2>
          <p className="mt-2 text-base text-muted">
            The manufacturing order has been registered in the system.
          </p>
          <div className="mt-5 rounded-xl border border-border bg-surface-raised px-4 py-4">
            <p className="text-sm font-semibold text-muted">Order ID</p>
            <p className="mt-1 font-mono text-2xl font-bold text-accent">
              {lastCreated.orderNo}
            </p>
            <p className="mt-2 text-sm text-muted">
              {lastCreated.customerName} · {lastCreated.productName} ·{' '}
              {lastCreated.totalQuantity} pcs
            </p>
          </div>
          <button
            type="button"
            onClick={resetForm}
            className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-xl bg-accent px-6 text-base font-bold text-white hover:brightness-110"
          >
            <PlusCircle className="h-5 w-5" />
            Create Another Order
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <section className="rounded-2xl border border-border bg-surface-raised p-5">
        <h2 className="text-2xl font-bold text-foreground">Create Order</h2>
        <p className="mt-1 text-base text-muted">
          Inquiry Coordinator / Estimation Engineer — register a new manufacturing
          order.
        </p>
      </section>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <SectionCard title="1. Order Basics">
          <label className="block space-y-1.5">
            <span className={labelClass}>Customer Name</span>
            <input
              list="customer-options"
              value={customer || customerQuery}
              onChange={(event) => {
                const value = event.target.value
                setCustomerQuery(value)
                setCustomer(customerNames.includes(value) ? value : '')
              }}
              onBlur={() => {
                if (customerNames.includes(customerQuery)) {
                  setCustomer(customerQuery)
                }
              }}
              placeholder={
                customersStatus === 'loading'
                  ? 'Loading customers…'
                  : 'Search or select customer'
              }
              required
              disabled={customersStatus === 'loading'}
              className={fieldClass}
            />
            <datalist id="customer-options">
              {filteredCustomers.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
            {customersError ? (
              <p className="text-sm text-danger">{customersError}</p>
            ) : null}
            {fieldErrors.customer ? (
              <p className="text-sm text-danger">{fieldErrors.customer}</p>
            ) : !customer && customerQuery ? (
              <p className="text-sm text-warning">
                Select a customer from the list.
              </p>
            ) : null}
          </label>

          <label className="block space-y-1.5">
            <span className={labelClass}>Product Name</span>
            <select
              value={productId}
              onChange={(event) => applyProductDefaults(event.target.value)}
              disabled={productsStatus === 'loading' || products.length === 0}
              required
              className={fieldClass}
            >
              {productsStatus === 'loading' ? (
                <option value="">Loading products…</option>
              ) : products.length === 0 ? (
                <option value="">No products available</option>
              ) : (
                products.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))
              )}
            </select>
            {productsError ? (
              <p className="text-sm text-danger">{productsError}</p>
            ) : null}
            {fieldErrors.productId ? (
              <p className="text-sm text-danger">{fieldErrors.productId}</p>
            ) : null}
          </label>

          <label className="block space-y-1.5">
            <span className={labelClass}>Order Reference / PO Number</span>
            <input
              value={poNumber}
              onChange={(event) => setPoNumber(event.target.value)}
              placeholder="e.g. PO-2026-0041 or CUST-REF-8891"
              required
              className={fieldClass}
            />
            {fieldErrors.poNumber ? (
              <p className="text-sm text-danger">{fieldErrors.poNumber}</p>
            ) : null}
          </label>
        </SectionCard>

        <SectionCard title="2. Quantity & Budget">
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block space-y-1.5">
              <span className={labelClass}>Total Quantity</span>
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                required
                className={fieldClass}
              />
              {fieldErrors.quantity ? (
                <p className="text-sm text-danger">{fieldErrors.quantity}</p>
              ) : null}
            </label>

            <label className="block space-y-1.5">
              <span className={labelClass}>Budget (Estimated Cost)</span>
              <input
                type="number"
                min={0}
                value={budget}
                onChange={(event) => setBudget(event.target.value)}
                placeholder="Customer budget"
                className={fieldClass}
              />
              {fieldErrors.budget ? (
                <p className="text-sm text-danger">{fieldErrors.budget}</p>
              ) : null}
            </label>

            <label className="block space-y-1.5">
              <span className={labelClass}>Estimation Price</span>
              <input
                type="number"
                min={0}
                value={
                  estimationManual ? estimationPrice : String(calculatedEstimate)
                }
                onChange={(event) => {
                  setEstimationManual(true)
                  setEstimationPrice(event.target.value)
                }}
                className={fieldClass}
              />
              <button
                type="button"
                onClick={() => {
                  setEstimationManual(false)
                  setEstimationPrice('')
                }}
                className="text-sm font-semibold text-accent hover:underline"
              >
                Recalculate from product rate
              </button>
              {fieldErrors.estimationPrice ? (
                <p className="text-sm text-danger">{fieldErrors.estimationPrice}</p>
              ) : null}
            </label>
          </div>

          <div className="rounded-xl border border-border bg-surface-muted px-4 py-3 text-sm">
            <p className="font-semibold text-foreground">
              Current estimate: {formatInr(displayEstimate)}
            </p>
            <p className="mt-1 text-muted">
              Rate used: {formatInr(unitRate)} / pc
              {budget
                ? ` · Budget vs estimate: ${
                    Number(budget) >= displayEstimate ? 'Within budget' : 'Over budget'
                  }`
                : ''}
            </p>
          </div>
        </SectionCard>

        <SectionCard title="3. Machine & Process">
          <label className="block space-y-1.5">
            <span className={labelClass}>Primary Machine</span>
            <select
              value={primaryMachineId}
              onChange={(event) => {
                const nextId = event.target.value
                setPrimaryMachineId(nextId)
                setAdditionalMachineIds((current) =>
                  current.filter((item) => item !== nextId),
                )
              }}
              disabled={machinesStatus === 'loading' || machines.length === 0}
              required
              className={fieldClass}
            >
              {machinesStatus === 'loading' ? (
                <option value="">Loading machines…</option>
              ) : machines.length === 0 ? (
                <option value="">No machines available</option>
              ) : (
                machines.map((machine) => (
                  <option key={machine.id} value={machine.id}>
                    {machineLabel(machine)}
                  </option>
                ))
              )}
            </select>
            {machinesError ? (
              <p className="text-sm text-danger">{machinesError}</p>
            ) : null}
            {fieldErrors.primaryMachineId ? (
              <p className="text-sm text-danger">{fieldErrors.primaryMachineId}</p>
            ) : null}
          </label>

          <div className="space-y-2">
            <span className={labelClass}>Additional Machines (optional)</span>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {additionalMachineOptions.map((machine) => {
                const checked = additionalMachineIds.includes(machine.id)
                return (
                  <label
                    key={machine.id}
                    className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-3 text-base font-semibold ${
                      checked
                        ? 'border-accent bg-accent-soft text-accent'
                        : 'border-border bg-surface-muted text-foreground'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleAdditionalMachine(machine.id)}
                      className="h-5 w-5 accent-teal-700"
                    />
                    {machineLabel(machine)}
                  </label>
                )
              })}
            </div>
          </div>

          <div>
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <span className={labelClass}>Process Steps</span>
                <p className="mt-1 text-sm text-muted">
                  Default route from product. Add steps from the process-step master.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  selectedProduct &&
                  setProcessSteps(
                    buildStepsFromProduct(
                      selectedProduct.processSteps,
                      processStepMasters,
                    ),
                  )
                }
                className="text-sm font-semibold text-accent hover:underline"
              >
                Reset to product defaults
              </button>
            </div>

            {processStepsError ? (
              <p className="mt-2 text-sm text-danger">{processStepsError}</p>
            ) : null}
            {fieldErrors.processSteps ? (
              <p className="mt-2 text-sm text-danger">{fieldErrors.processSteps}</p>
            ) : null}

            <ol className="mt-3 space-y-2">
              {processSteps.map((step, index) => (
                <li
                  key={step.id}
                  className="flex min-h-12 items-center gap-3 rounded-xl border border-border bg-surface-muted px-3 text-base"
                >
                  <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-white">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground">
                      {step.name}
                      {step.isCustom ? (
                        <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-warning">
                          Added
                        </span>
                      ) : null}
                    </p>
                    <p className="text-sm text-muted">
                      {step.hours.toFixed(2)}h / pc
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeStep(step.id)}
                    className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg border border-border bg-surface-raised text-muted transition hover:border-danger hover:text-danger"
                    aria-label={`Remove ${step.name}`}
                    title="Remove step"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ol>

            <div className="mt-4 rounded-xl border border-dashed border-border bg-surface-muted/60 p-3">
              <p className="mb-2 text-sm font-bold text-foreground">
                Add Process Step
              </p>
              <div className="grid gap-3 sm:grid-cols-[1fr_140px_auto]">
                <select
                  value={newStepId}
                  onChange={(event) => {
                    const nextId = event.target.value
                    setNewStepId(nextId)
                    const master = processStepMasters.find(
                      (item) => item.id === nextId,
                    )
                    if (master) {
                      setNewStepHours(String(master.standardHoursPerPiece))
                    }
                  }}
                  disabled={
                    processStepsStatus === 'loading' ||
                    availableProcessSteps.length === 0
                  }
                  className={fieldClass}
                >
                  {processStepsStatus === 'loading' ? (
                    <option value="">Loading process steps…</option>
                  ) : availableProcessSteps.length === 0 ? (
                    <option value="">All process steps added</option>
                  ) : (
                    <>
                      <option value="">Select a process step</option>
                      {availableProcessSteps.map((step) => (
                        <option key={step.id} value={step.id}>
                          {step.name}
                        </option>
                      ))}
                    </>
                  )}
                </select>
                <input
                  type="number"
                  min={0.01}
                  step={0.01}
                  value={newStepHours}
                  onChange={(event) => setNewStepHours(event.target.value)}
                  placeholder="Hours/pc"
                  className={fieldClass}
                />
                <button
                  type="button"
                  onClick={addCustomStep}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-foreground px-4 text-sm font-bold text-surface-raised hover:opacity-90"
                >
                  <PlusCircle className="h-4 w-4" />
                  Add Step
                </button>
              </div>
              {stepError ? (
                <p className="mt-2 text-sm font-semibold text-danger">{stepError}</p>
              ) : (
                <p className="mt-2 text-sm text-muted">
                  {processSteps.length} step{processSteps.length === 1 ? '' : 's'}{' '}
                  configured
                </p>
              )}
            </div>
          </div>
        </SectionCard>

        <SectionCard title="4. Schedule">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1.5">
              <span className={labelClass}>Target Completion Date</span>
              <input
                type="date"
                value={targetDate}
                onChange={(event) => setTargetDate(event.target.value)}
                required
                className={fieldClass}
              />
              {fieldErrors.targetDate ? (
                <p className="text-sm text-danger">{fieldErrors.targetDate}</p>
              ) : null}
            </label>

            <label className="block space-y-1.5">
              <span className={labelClass}>Priority</span>
              <select
                value={priority}
                onChange={(event) => setPriority(event.target.value as Priority)}
                className={fieldClass}
              >
                <option value="Normal">Normal</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </label>
          </div>
        </SectionCard>

        <SectionCard title="5. Notes">
          <label className="block space-y-1.5">
            <span className={labelClass}>Internal Notes / Special Instructions</span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={4}
              placeholder="Drawing revision, packing notes, inspection requirements…"
              className="w-full rounded-xl border border-border bg-surface-muted px-3 py-3 text-base outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
          </label>
        </SectionCard>

        {createError ? (
          <div className="rounded-xl border border-danger/30 bg-red-50 px-4 py-3 text-sm font-medium text-danger">
            {createError}
          </div>
        ) : null}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={resetForm}
            className="min-h-12 rounded-xl border border-border bg-surface-raised px-6 text-base font-bold text-foreground hover:bg-surface-muted"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createStatus === 'loading'}
            className="min-h-12 rounded-xl bg-accent px-8 text-base font-bold text-white hover:brightness-110 disabled:opacity-70"
          >
            {createStatus === 'loading' ? 'Creating…' : 'Create Order'}
          </button>
        </div>
      </form>
    </div>
  )
}
