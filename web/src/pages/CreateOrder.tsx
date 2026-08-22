import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { CheckCircle2, PlusCircle, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { fetchProducts } from '../store/slices/mastersSlice'
import { clearCreateOrderState, createOrder } from '../store/slices/ordersSlice'
import type { CreateOrderPayload, OrderPriorityApi } from '../types/orders'

type Priority = 'Normal' | 'High' | 'Urgent'

interface ProductLine {
  key: string
  productId: string
  quantity: string
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

function newLineKey(): string {
  return `line-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function emptyLine(): ProductLine {
  return { key: newLineKey(), productId: '', quantity: '' }
}

type FieldErrors = {
  poNumber?: string
  products?: string
  budget?: string
  estimationPrice?: string
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
  const navigate = useNavigate()
  const products = useAppSelector((state) => state.masters.products)
  const productsStatus = useAppSelector((state) => state.masters.productsStatus)
  const productsError = useAppSelector((state) => state.masters.productsError)
  const createStatus = useAppSelector((state) => state.orders.createStatus)
  const createError = useAppSelector((state) => state.orders.createError)
  const lastCreated = useAppSelector((state) => state.orders.lastCreated)

  const [poNumber, setPoNumber] = useState('')
  const [lines, setLines] = useState<ProductLine[]>([emptyLine()])
  const [budget, setBudget] = useState('')
  const [estimationManual, setEstimationManual] = useState(false)
  const [estimationPrice, setEstimationPrice] = useState('')
  const [targetDate, setTargetDate] = useState(todayIsoDate())
  const [priority, setPriority] = useState<Priority>('Normal')
  const [notes, setNotes] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  useEffect(() => {
    void dispatch(fetchProducts())
  }, [dispatch])

  const calculatedEstimate = useMemo(() => {
    return lines.reduce((sum, line) => {
      const product = products.find((item) => item.id === line.productId)
      const qty = Number(line.quantity)
      if (!product || !Number.isFinite(qty) || qty < 1) return sum
      return sum + qty * product.unitRate
    }, 0)
  }, [lines, products])

  const displayEstimate = estimationManual
    ? Number(estimationPrice) || 0
    : calculatedEstimate

  const totalQuantity = useMemo(
    () =>
      lines.reduce((sum, line) => {
        const qty = Number(line.quantity)
        return Number.isInteger(qty) && qty > 0 ? sum + qty : sum
      }, 0),
    [lines],
  )

  function updateLine(key: string, patch: Partial<ProductLine>) {
    setLines((current) =>
      current.map((line) => (line.key === key ? { ...line, ...patch } : line)),
    )
    setEstimationManual(false)
  }

  function addLine() {
    setLines((current) => [...current, emptyLine()])
  }

  function removeLine(key: string) {
    setLines((current) =>
      current.length === 1 ? current : current.filter((line) => line.key !== key),
    )
    setEstimationManual(false)
  }

  function resetForm() {
    setPoNumber('')
    setLines([emptyLine()])
    setBudget('')
    setEstimationManual(false)
    setEstimationPrice('')
    setTargetDate(todayIsoDate())
    setPriority('Normal')
    setNotes('')
    setFieldErrors({})
    dispatch(clearCreateOrderState())
  }

  function validateForm(): FieldErrors {
    const errors: FieldErrors = {}
    const budgetValue = budget === '' ? undefined : Number(budget)

    if (!poNumber.trim()) {
      errors.poNumber = 'Order reference / PO number is required.'
    }

    const selectedIds = lines.map((line) => line.productId).filter(Boolean)
    const hasEmpty = lines.some((line) => !line.productId || !line.quantity.trim())
    const hasBadQty = lines.some((line) => {
      const qty = Number(line.quantity)
      return line.quantity.trim() !== '' && (!Number.isInteger(qty) || qty < 1)
    })
    const hasDuplicate = selectedIds.length !== new Set(selectedIds).size

    if (lines.length === 0 || hasEmpty) {
      errors.products = 'Add at least one product with quantity.'
    } else if (hasBadQty) {
      errors.products = 'Each quantity must be a whole number of at least 1.'
    } else if (hasDuplicate) {
      errors.products = 'The same product cannot be added twice.'
    }

    if (budget !== '' && (!Number.isFinite(budgetValue) || (budgetValue ?? 0) < 0)) {
      errors.budget = 'Budget must be 0 or greater.'
    }
    if (!Number.isFinite(displayEstimate) || displayEstimate < 0) {
      errors.estimationPrice = 'Estimation price must be 0 or greater.'
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
    const productsPayload = lines
      .map((line) => ({
        productId: line.productId,
        quantity: Number(line.quantity),
      }))
      .filter((line) => line.productId && Number.isInteger(line.quantity) && line.quantity >= 1)

    if (productsPayload.length === 0) return null

    const payload: CreateOrderPayload = {
      customerPoRef: poNumber.trim(),
      products: productsPayload,
      estimationPrice: displayEstimate,
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
            The manufacturing order has been registered. Production can add
            customer, machine, and process details later.
          </p>
          <div className="mt-5 rounded-xl border border-border bg-surface-raised px-4 py-4 text-left">
            <p className="text-sm font-semibold text-muted">Order ID</p>
            <p className="mt-1 font-mono text-2xl font-bold text-accent">
              {lastCreated.orderNo}
            </p>
            <ul className="mt-3 space-y-1 text-sm text-muted">
              {(lastCreated.products ?? []).map((line) => (
                <li key={line.productId}>
                  {line.productName} · {line.quantity} pcs
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-6 flex flex-col-reverse justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => {
                dispatch(clearCreateOrderState())
                navigate('/orders')
              }}
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-border bg-surface-raised px-6 text-base font-bold text-foreground"
            >
              View Orders
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-accent px-6 text-base font-bold text-white hover:brightness-110"
            >
              <PlusCircle className="h-5 w-5" />
              Create Another Order
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <section className="rounded-2xl border border-border bg-surface-raised p-5">
        <h2 className="text-2xl font-bold text-foreground">Create New Order</h2>
        <p className="mt-1 text-base text-muted">
          Register the order with one or more products. Customer, machine, and
          process details will be added by Production / Floor Manager.
        </p>
      </section>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <SectionCard title="1. Order Reference">
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

        <SectionCard title="2. Products & Quantity">
          <p className="text-sm text-muted">
            Add each product on its own row with the ordered quantity.
          </p>
          <div className="space-y-3">
            {lines.map((line, index) => {
              const usedIds = new Set(
                lines
                  .filter((item) => item.key !== line.key && item.productId)
                  .map((item) => item.productId),
              )
              const options = products.filter(
                (item) => !usedIds.has(item.id) || item.id === line.productId,
              )
              const selected = products.find((item) => item.id === line.productId)

              return (
                <div
                  key={line.key}
                  className="grid gap-3 rounded-xl border border-border bg-surface-muted/50 p-3 sm:grid-cols-[1fr_140px_auto]"
                >
                  <label className="block space-y-1.5">
                    <span className={labelClass}>
                      Product {index + 1}
                    </span>
                    <select
                      value={line.productId}
                      onChange={(event) =>
                        updateLine(line.key, { productId: event.target.value })
                      }
                      disabled={
                        productsStatus === 'loading' || products.length === 0
                      }
                      required
                      className={fieldClass}
                    >
                      {productsStatus === 'loading' ? (
                        <option value="">Loading products…</option>
                      ) : products.length === 0 ? (
                        <option value="">No products available</option>
                      ) : (
                        <>
                          <option value="">Select a product</option>
                          {options.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name}
                            </option>
                          ))}
                        </>
                      )}
                    </select>
                  </label>

                  <label className="block space-y-1.5">
                    <span className={labelClass}>Quantity</span>
                    <input
                      type="number"
                      min={1}
                      value={line.quantity}
                      onChange={(event) =>
                        updateLine(line.key, { quantity: event.target.value })
                      }
                      required
                      className={fieldClass}
                    />
                  </label>

                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => removeLine(line.key)}
                      disabled={lines.length === 1}
                      className="inline-flex min-h-12 min-w-12 items-center justify-center rounded-xl border border-border bg-surface-raised text-muted hover:border-danger hover:text-danger disabled:opacity-40"
                      aria-label={`Remove product ${index + 1}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {selected ? (
                    <p className="sm:col-span-3 text-sm text-muted">
                      {selected.productCode} · {formatInr(selected.unitRate)} /{' '}
                      {selected.uom.toLowerCase()}
                      {Number(line.quantity) > 0
                        ? ` · Line estimate ${formatInr(Number(line.quantity) * selected.unitRate)}`
                        : ''}
                    </p>
                  ) : null}
                </div>
              )
            })}
          </div>

          <button
            type="button"
            onClick={addLine}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-surface-muted px-4 text-sm font-bold text-foreground hover:border-accent hover:text-accent"
          >
            <PlusCircle className="h-4 w-4" />
            Add another product
          </button>

          {productsError ? (
            <p className="text-sm text-danger">{productsError}</p>
          ) : null}
          {fieldErrors.products ? (
            <p className="text-sm text-danger">{fieldErrors.products}</p>
          ) : null}
        </SectionCard>

        <SectionCard title="3. Budget">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1.5">
              <span className={labelClass}>Budget (optional)</span>
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
                Recalculate from product rates
              </button>
              {fieldErrors.estimationPrice ? (
                <p className="text-sm text-danger">{fieldErrors.estimationPrice}</p>
              ) : null}
            </label>
          </div>

          <div className="rounded-xl border border-border bg-surface-muted px-4 py-3 text-sm">
            <p className="font-semibold text-foreground">
              {totalQuantity} pcs · Estimate {formatInr(displayEstimate)}
            </p>
            {budget ? (
              <p className="mt-1 text-muted">
                Budget vs estimate:{' '}
                {Number(budget) >= displayEstimate ? 'Within budget' : 'Over budget'}
              </p>
            ) : null}
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
            onClick={() => {
              resetForm()
              navigate('/orders')
            }}
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
