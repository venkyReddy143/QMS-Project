import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { CheckCircle2, PlusCircle, Trash2 } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { fetchNextOrderNoApi } from '../lib/api/orders'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { fetchProducts } from '../store/slices/mastersSlice'
import {
  clearCreateOrderState,
  createOrder,
  fetchOrder,
  updateOrderDetails,
} from '../store/slices/ordersSlice'
import type { OrderPriorityApi, ProductionOrder } from '../types/orders'

type Priority = 'Normal' | 'High' | 'Urgent'
type HeaderStatus = 'OPEN' | 'CLOSED'
type DetailStep = 'products' | 'schedule' | 'notes'

interface ProductLine {
  key: string
  productId: string
  quantity: string
  description: string
  drawingNumber: string
  remarks: string
  rawMaterialSourcing: 'COMPANY' | 'CUSTOMER'
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
  return {
    key: newLineKey(),
    productId: '',
    quantity: '',
    description: '',
    drawingNumber: '',
    remarks: '',
    rawMaterialSourcing: 'COMPANY',
  }
}

type FieldErrors = {
  poNumber?: string
  products?: string
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
  const [searchParams, setSearchParams] = useSearchParams()
  const resumeOrderId = searchParams.get('orderId')?.trim() ?? ''
  const products = useAppSelector((state) => state.masters.products)
  const productsStatus = useAppSelector((state) => state.masters.productsStatus)
  const productsError = useAppSelector((state) => state.masters.productsError)
  const createStatus = useAppSelector((state) => state.orders.createStatus)
  const createError = useAppSelector((state) => state.orders.createError)
  const detailsStatus = useAppSelector((state) => state.orders.detailsStatus)
  const detailsError = useAppSelector((state) => state.orders.detailsError)

  const [poNumber, setPoNumber] = useState('')
  const [orderId, setOrderId] = useState('')
  const [orderIdLoading, setOrderIdLoading] = useState(true)
  const [customerName, setCustomerName] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [inChargeName, setInChargeName] = useState('')
  const [orderDate, setOrderDate] = useState(todayIsoDate())
  const [headerStatus, setHeaderStatus] = useState<HeaderStatus>('OPEN')
  const [lines, setLines] = useState<ProductLine[]>([emptyLine()])
  const [targetDate, setTargetDate] = useState(todayIsoDate())
  const [priority, setPriority] = useState<Priority>('Normal')
  const [notes, setNotes] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [createdOrder, setCreatedOrder] = useState<ProductionOrder | null>(null)
  const [detailStep, setDetailStep] = useState<DetailStep>('products')
  const [finished, setFinished] = useState(false)
  const [stepMessage, setStepMessage] = useState<string | null>(null)
  const [resumeLoading, setResumeLoading] = useState(Boolean(resumeOrderId))
  const [resumeError, setResumeError] = useState<string | null>(null)

  async function loadNextOrderId() {
    setOrderIdLoading(true)
    try {
      const response = await fetchNextOrderNoApi()
      if (response.success && response.orderNo) {
        setOrderId(response.orderNo)
      }
    } catch {
      setOrderId('')
    } finally {
      setOrderIdLoading(false)
    }
  }

  useEffect(() => {
    void dispatch(fetchProducts())
  }, [dispatch])

  useEffect(() => {
    if (!resumeOrderId) {
      setResumeLoading(false)
      void loadNextOrderId()
      return
    }

    let active = true
    setResumeLoading(true)
    setResumeError(null)
    setOrderIdLoading(false)

    void dispatch(fetchOrder(resumeOrderId))
      .unwrap()
      .then((order) => {
        if (!active) return
        const hasProducts =
          (order.products?.length ?? 0) > 0 || Boolean(order.productId)
        if (hasProducts) {
          navigate(`/orders/${order.id}`, { replace: true })
          return
        }
        setCreatedOrder(order)
        setOrderId(order.orderNo)
        setPoNumber(order.customerPoRef || '')
        setCustomerName(order.customerName || '')
        setOwnerName(order.ownerName || '')
        setInChargeName(order.inChargeName || '')
        setOrderDate(
          order.orderDate
            ? String(order.orderDate).slice(0, 10)
            : todayIsoDate(),
        )
        setHeaderStatus(order.status === 'CLOSED' ? 'CLOSED' : 'OPEN')
        setDetailStep('products')
        setLines([emptyLine()])
        setStepMessage('Add products to continue this order.')
        setResumeLoading(false)
      })
      .catch((error: unknown) => {
        if (!active) return
        setResumeError(
          error instanceof Error ? error.message : 'Failed to load order.',
        )
        setResumeLoading(false)
        void loadNextOrderId()
      })

    return () => {
      active = false
    }
  }, [dispatch, navigate, resumeOrderId])

  const calculatedEstimate = useMemo(() => {
    return lines.reduce((sum, line) => {
      const product = products.find((item) => item.id === line.productId)
      const qty = Number(line.quantity)
      if (!product || !Number.isFinite(qty) || qty < 1) return sum
      return sum + qty * product.unitRate
    }, 0)
  }, [lines, products])

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
  }

  function addLine() {
    setLines((current) => [...current, emptyLine()])
  }

  function removeLine(key: string) {
    setLines((current) =>
      current.length === 1 ? current : current.filter((line) => line.key !== key),
    )
  }

  function resetForm() {
    setPoNumber('')
    setCustomerName('')
    setOwnerName('')
    setInChargeName('')
    setOrderDate(todayIsoDate())
    setHeaderStatus('OPEN')
    setLines([emptyLine()])
    setTargetDate(todayIsoDate())
    setPriority('Normal')
    setNotes('')
    setFieldErrors({})
    setCreatedOrder(null)
    setDetailStep('products')
    setFinished(false)
    setStepMessage(null)
    setResumeError(null)
    dispatch(clearCreateOrderState())
    setSearchParams({}, { replace: true })
    void loadNextOrderId()
  }

  function validateHeader(): FieldErrors {
    const errors: FieldErrors = {}
    if (!poNumber.trim()) {
      errors.poNumber = 'Order reference / PO number is required.'
    }
    return errors
  }

  function validateProducts(): FieldErrors {
    const errors: FieldErrors = {}
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
    return errors
  }

  function validateSchedule(): FieldErrors {
    const errors: FieldErrors = {}
    if (!targetDate) {
      errors.targetDate = 'Target completion date is required.'
    } else if (Number.isNaN(new Date(targetDate).getTime())) {
      errors.targetDate = 'Enter a valid target completion date.'
    } else if (targetDate < todayIsoDate()) {
      errors.targetDate = 'Target completion date cannot be in the past.'
    }
    return errors
  }

  function buildProductsPayload() {
    return lines
      .map((line) => ({
        productId: line.productId,
        quantity: Number(line.quantity),
        description: line.description.trim(),
        drawingNumber: line.drawingNumber.trim(),
        remarks: line.remarks.trim(),
        rawMaterialSourcing: line.rawMaterialSourcing,
      }))
      .filter(
        (line) =>
          line.productId && Number.isInteger(line.quantity) && line.quantity >= 1,
      )
  }

  async function handleHeaderSubmit(event: FormEvent) {
    event.preventDefault()
    const errors = validateHeader()
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    try {
      const order = await dispatch(
        createOrder({
          orderNo: orderId.trim(),
          customerPoRef: poNumber.trim(),
          customerName: customerName.trim(),
          ownerName: ownerName.trim(),
          inChargeName: inChargeName.trim(),
          orderDate,
          status: headerStatus,
          products: [],
        }),
      ).unwrap()
      setCreatedOrder(order)
      setDetailStep('products')
      setStepMessage('Order created. Continue with products, schedule, and notes.')
    } catch {
      return
    }
  }

  async function handleProductsNext() {
    if (!createdOrder) return
    const errors = validateProducts()
    setFieldErrors(errors)
    setStepMessage(null)
    if (Object.keys(errors).length > 0) return

    try {
      const order = await dispatch(
        updateOrderDetails({
          orderId: createdOrder.id,
          payload: { products: buildProductsPayload() },
        }),
      ).unwrap()
      setCreatedOrder(order)
      setDetailStep('schedule')
      setStepMessage('Products saved.')
    } catch {
      return
    }
  }

  async function handleScheduleNext() {
    if (!createdOrder) return
    const errors = validateSchedule()
    setFieldErrors(errors)
    setStepMessage(null)
    if (Object.keys(errors).length > 0) return

    try {
      const order = await dispatch(
        updateOrderDetails({
          orderId: createdOrder.id,
          payload: {
            dueDate: targetDate,
            priority: PRIORITY_API[priority],
          },
        }),
      ).unwrap()
      setCreatedOrder(order)
      setDetailStep('notes')
      setStepMessage('Schedule saved.')
    } catch {
      return
    }
  }

  async function handleNotesFinish() {
    if (!createdOrder) return
    setFieldErrors({})
    setStepMessage(null)

    try {
      const order = await dispatch(
        updateOrderDetails({
          orderId: createdOrder.id,
          payload: { notes: notes.trim() },
        }),
      ).unwrap()
      setCreatedOrder(order)
      setFinished(true)
    } catch {
      return
    }
  }

  const savingDetails = detailsStatus === 'loading'

  if (resumeLoading) {
    return (
      <div className="mx-auto max-w-4xl">
        <section className="rounded-2xl border border-border bg-surface-raised p-5">
          <p className="text-base text-muted">Loading order…</p>
        </section>
      </div>
    )
  }

  if (finished && createdOrder) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl border border-success/30 bg-emerald-50 p-6 text-center sm:p-8">
          <CheckCircle2 className="mx-auto h-14 w-14 text-success" />
          <h2 className="mt-4 text-2xl font-bold text-foreground">
            Order Created Successfully
          </h2>
          <p className="mt-2 text-base text-muted">
            Header, products, schedule, and notes are saved. Production can add
            machine and process details later.
          </p>
          <div className="mt-5 rounded-xl border border-border bg-surface-raised px-4 py-4 text-left">
            <p className="text-sm font-semibold text-muted">Order ID</p>
            <p className="mt-1 font-mono text-2xl font-bold text-accent">
              {createdOrder.orderNo}
            </p>
            <p className="mt-2 text-sm text-muted">
              Status: {createdOrder.status === 'CLOSED' ? 'Close' : 'Open'}
            </p>
            <ul className="mt-3 space-y-1 text-sm text-muted">
              {(createdOrder.products ?? []).map((line) => (
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
                navigate(`/orders/${createdOrder.id}`)
              }}
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-border bg-surface-raised px-6 text-base font-bold text-foreground"
            >
              View Order
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
      {!createdOrder ? (
        <>
          <section className="rounded-2xl border border-border bg-surface-raised p-5">
            <h2 className="text-2xl font-bold text-foreground">Create New Order</h2>
            <p className="mt-1 text-base text-muted">
              Start with the order header. Products, schedule, and notes unlock after
              the order is created.
            </p>
          </section>

          <form onSubmit={handleHeaderSubmit} noValidate className="space-y-4">
          <SectionCard title="Order Header">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-1.5">
                <span className={labelClass}>Order ID</span>
                <input
                  value={orderIdLoading ? 'Generating…' : orderId}
                  readOnly
                  className={`${fieldClass} cursor-default bg-surface-muted/80 font-mono font-semibold text-accent`}
                />
                <p className="text-xs text-muted">
                  Auto-generated format: ORD-YYYYMMDD-0001
                </p>
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
              <label className="block space-y-1.5">
                <span className={labelClass}>Order Date</span>
                <input
                  type="date"
                  value={orderDate}
                  onChange={(event) => setOrderDate(event.target.value)}
                  className={fieldClass}
                />
              </label>
              <label className="block space-y-1.5">
                <span className={labelClass}>Customer</span>
                <input
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                  placeholder="Customer name"
                  className={fieldClass}
                />
              </label>
              <label className="block space-y-1.5">
                <span className={labelClass}>Status</span>
                <select
                  value={headerStatus}
                  onChange={(event) =>
                    setHeaderStatus(event.target.value as HeaderStatus)
                  }
                  className={fieldClass}
                >
                  <option value="OPEN">Open</option>
                  <option value="CLOSED">Close</option>
                </select>
              </label>
              <label className="block space-y-1.5">
                <span className={labelClass}>Owner</span>
                <input
                  value={ownerName}
                  onChange={(event) => setOwnerName(event.target.value)}
                  className={fieldClass}
                />
              </label>
              <label className="block space-y-1.5">
                <span className={labelClass}>In Charge</span>
                <input
                  value={inChargeName}
                  onChange={(event) => setInChargeName(event.target.value)}
                  className={fieldClass}
                />
              </label>
            </div>
          </SectionCard>

          {resumeError ? (
            <div className="rounded-xl border border-danger/30 bg-red-50 px-4 py-3 text-sm font-medium text-danger">
              {resumeError}
            </div>
          ) : null}

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
              disabled={createStatus === 'loading' || orderIdLoading || !orderId}
              className="min-h-12 rounded-xl bg-accent px-8 text-base font-bold text-white hover:brightness-110 disabled:opacity-70"
            >
              {createStatus === 'loading' ? 'Creating…' : 'Create order'}
            </button>
          </div>
        </form>
        </>
      ) : (
        <div className="space-y-3">
          <section className="rounded-xl border border-border bg-surface-raised px-4 py-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch sm:justify-between sm:gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="text-xs font-bold uppercase tracking-wide text-muted">
                    Order
                  </span>
                  <span className="font-mono text-base font-bold text-accent">
                    {createdOrder.orderNo}
                  </span>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                    {createdOrder.status === 'CLOSED' ? 'Close' : 'Open'}
                  </span>
                </div>
                <dl className="mt-1.5 grid gap-x-4 gap-y-0.5 text-sm sm:grid-cols-2">
                  <div className="flex gap-1.5 min-w-0">
                    <dt className="shrink-0 text-muted">PO:</dt>
                    <dd className="truncate font-semibold">
                      {createdOrder.customerPoRef || '—'}
                    </dd>
                  </div>
                  <div className="flex gap-1.5 min-w-0">
                    <dt className="shrink-0 text-muted">Date:</dt>
                    <dd className="font-semibold">
                      {String(createdOrder.orderDate || orderDate).slice(0, 10)}
                    </dd>
                  </div>
                  <div className="flex gap-1.5 min-w-0">
                    <dt className="shrink-0 text-muted">Owner:</dt>
                    <dd className="truncate font-semibold">
                      {createdOrder.ownerName || ownerName || '—'}
                    </dd>
                  </div>
                  <div className="flex gap-1.5 min-w-0">
                    <dt className="shrink-0 text-muted">In charge:</dt>
                    <dd className="truncate font-semibold">
                      {createdOrder.inChargeName || inChargeName || '—'}
                    </dd>
                  </div>
                </dl>
                {stepMessage ? (
                  <p className="mt-2 text-xs font-semibold text-accent">
                    {stepMessage}
                  </p>
                ) : null}
              </div>

              <div className="flex shrink-0 flex-col items-end justify-start sm:min-w-[9.5rem]">
                <p className="max-w-[14rem] text-right text-sm font-bold text-foreground">
                  <span className="font-semibold text-muted">Customer: </span>
                  {createdOrder.customerName || customerName || '—'}
                </p>
              </div>
            </div>
          </section>

          {detailsError ? (
            <div className="rounded-xl border border-danger/30 bg-red-50 px-3 py-2 text-sm font-medium text-danger">
              {detailsError}
            </div>
          ) : null}

          {detailStep === 'products' ? (
            <SectionCard title="1. Products">
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
                        <span className={labelClass}>Product {index + 1}</span>
                        <select
                          value={line.productId}
                          onChange={(event) =>
                            updateLine(line.key, { productId: event.target.value })
                          }
                          disabled={
                            productsStatus === 'loading' || products.length === 0
                          }
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

                      <label className="block space-y-1.5 sm:col-span-3">
                        <span className={labelClass}>Product Details</span>
                        <textarea
                          value={line.description}
                          onChange={(event) =>
                            updateLine(line.key, {
                              description: event.target.value,
                            })
                          }
                          rows={2}
                          placeholder="Product details / description"
                          className="w-full rounded-xl border border-border bg-surface-muted px-3 py-3 text-base outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                        />
                      </label>
                      <div className="grid gap-3 sm:col-span-3 sm:grid-cols-2">
                        <label className="block space-y-1.5">
                          <span className={labelClass}>Drawing Number</span>
                          <input
                            value={line.drawingNumber}
                            onChange={(event) =>
                              updateLine(line.key, {
                                drawingNumber: event.target.value,
                              })
                            }
                            className={fieldClass}
                          />
                        </label>
                        <label className="block space-y-1.5">
                          <span className={labelClass}>Raw Material Sourcing</span>
                          <select
                            value={line.rawMaterialSourcing}
                            onChange={(event) =>
                              updateLine(line.key, {
                                rawMaterialSourcing: event.target.value as
                                  | 'COMPANY'
                                  | 'CUSTOMER',
                              })
                            }
                            className={fieldClass}
                          >
                            <option value="COMPANY">Company</option>
                            <option value="CUSTOMER">Customer</option>
                          </select>
                        </label>
                      </div>
                      <label className="block space-y-1.5 sm:col-span-3">
                        <span className={labelClass}>Line Remarks</span>
                        <input
                          value={line.remarks}
                          onChange={(event) =>
                            updateLine(line.key, { remarks: event.target.value })
                          }
                          className={fieldClass}
                        />
                      </label>

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

              <p className="text-sm text-muted">
                {totalQuantity} pcs · Estimate {formatInr(calculatedEstimate)}
              </p>

              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={savingDetails}
                  onClick={() => void handleProductsNext()}
                  className="min-h-12 rounded-xl bg-accent px-8 text-base font-bold text-white hover:brightness-110 disabled:opacity-70"
                >
                  {savingDetails ? 'Saving…' : 'Save & Continue'}
                </button>
              </div>
            </SectionCard>
          ) : null}

          {detailStep === 'schedule' ? (
            <SectionCard title="2. Schedule">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block space-y-1.5">
                  <span className={labelClass}>Target Completion Date</span>
                  <input
                    type="date"
                    value={targetDate}
                    onChange={(event) => setTargetDate(event.target.value)}
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
                    onChange={(event) =>
                      setPriority(event.target.value as Priority)
                    }
                    className={fieldClass}
                  >
                    <option value="Normal">Normal</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </label>
              </div>
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                <button
                  type="button"
                  onClick={() => setDetailStep('products')}
                  className="min-h-12 rounded-xl border border-border px-6 text-base font-bold"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={savingDetails}
                  onClick={() => void handleScheduleNext()}
                  className="min-h-12 rounded-xl bg-accent px-8 text-base font-bold text-white hover:brightness-110 disabled:opacity-70"
                >
                  {savingDetails ? 'Saving…' : 'Save & Continue'}
                </button>
              </div>
            </SectionCard>
          ) : null}

          {detailStep === 'notes' ? (
            <SectionCard title="3. Notes">
              <label className="block space-y-1.5">
                <span className={labelClass}>
                  Internal Notes / Special Instructions
                </span>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={4}
                  placeholder="Drawing revision, packing notes, inspection requirements…"
                  className="w-full rounded-xl border border-border bg-surface-muted px-3 py-3 text-base outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                />
              </label>
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                <button
                  type="button"
                  onClick={() => setDetailStep('schedule')}
                  className="min-h-12 rounded-xl border border-border px-6 text-base font-bold"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={savingDetails}
                  onClick={() => void handleNotesFinish()}
                  className="min-h-12 rounded-xl bg-accent px-8 text-base font-bold text-white hover:brightness-110 disabled:opacity-70"
                >
                  {savingDetails ? 'Saving…' : 'Finish Order'}
                </button>
              </div>
            </SectionCard>
          ) : null}
        </div>
      )}
    </div>
  )
}
