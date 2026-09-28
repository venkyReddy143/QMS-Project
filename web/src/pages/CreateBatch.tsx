import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { fetchAdminMachinesApi } from '../lib/api/admin'
import {
  createBatchApi,
  fetchBatchesApi,
  updateBatchProcessStepsApi,
} from '../lib/api/batches'
import { fetchOrderApi } from '../lib/api/orders'
import type { AdminMachine } from '../types/admin'
import type {
  OrderPriorityApi,
  ProductionBatch,
  ProductionOrder,
} from '../types/orders'

const fieldClass =
  'min-h-12 w-full rounded-xl border border-border bg-surface-muted px-3 text-base text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/20'

const labelClass = 'block text-sm font-bold text-foreground'

const sectionClass =
  'space-y-4 rounded-2xl border border-border bg-surface-raised p-5'

const sectionTitleClass = 'text-lg font-bold text-foreground'

interface StepDraft {
  key: string
  processStepName: string
  machineId: string
}

function todayIsoDate(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

function nextBatchNo(batches: ProductionBatch[]): string {
  let max = 0
  for (const batch of batches) {
    const match = batch.batchNo.match(/(\d+)\s*$/)
    if (match) max = Math.max(max, Number(match[1]))
  }
  return `B${String(max + 1).padStart(2, '0')}`
}

function draftKey(): string {
  return Math.random().toString(36).slice(2)
}

export function CreateBatch() {
  const { orderId = '' } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [order, setOrder] = useState<ProductionOrder | null>(null)
  const [batches, setBatches] = useState<ProductionBatch[]>([])
  const [, setMachines] = useState<AdminMachine[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // A batch is created (in Open status) the moment the form is first
  // submitted; a retry after a partial failure reuses it instead of
  // creating a duplicate.
  const [createdBatchId, setCreatedBatchId] = useState<string | null>(null)

  // Header Information
  const [productId, setProductId] = useState('')
  const [batchNo, setBatchNo] = useState('B01')

  // Define Quantity
  const [quantity, setQuantity] = useState('')
  const [bufferQty, setBufferQty] = useState('0')
  const [totalOverride, setTotalOverride] = useState<string | null>(null)
  const [targetDate, setTargetDate] = useState(todayIsoDate())
  const [priority, setPriority] = useState<'Normal' | 'High' | 'Urgent'>('Normal')

  // Process Steps + Assign Machines (carried over from the order line's
  // route; no longer editable on this screen — see Order Detail's process
  // planning step for that).
  const [steps, setSteps] = useState<StepDraft[]>([])

  useEffect(() => {
    if (user && user.role !== 'Super Admin') {
      navigate(`/orders/${orderId}`, { replace: true })
    }
  }, [navigate, orderId, user])

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const [orderRes, batchRes, machineRes] = await Promise.all([
          fetchOrderApi(orderId),
          fetchBatchesApi(orderId),
          fetchAdminMachinesApi(),
        ])
        if (!active) return
        const nextOrder = orderRes.order
        if (!nextOrder) {
          setError(orderRes.message || 'Order not found.')
          return
        }
        const nextBatches = batchRes.batches ?? []
        setOrder(nextOrder)
        setBatches(nextBatches)
        setMachines(machineRes.machines ?? [])
        const firstProduct = nextOrder.products[0]
        setProductId(firstProduct?.productId ?? '')
        setBatchNo(nextBatchNo(nextBatches))
        setSteps(
          (firstProduct?.processSteps ?? []).map((item) => ({
            key: draftKey(),
            processStepName: item.name,
            machineId: item.machineId ?? '',
          })),
        )
      } catch (loadError) {
        if (!active) return
        setError(
          loadError instanceof Error ? loadError.message : 'Failed to load order.',
        )
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [orderId])

  const products = order?.products ?? []
  const selectedProduct = products.find((item) => item.productId === productId)

  const remaining = useMemo(() => {
    if (!selectedProduct) return 0
    const allocated = batches
      .filter((item) => item.productId === selectedProduct.productId)
      .reduce((sum, item) => sum + item.plannedQuantity, 0)
    return Math.max(0, selectedProduct.quantity - allocated)
  }, [batches, selectedProduct])

  const plannedNumber = Number(quantity) || 0
  const bufferNumber = Number(bufferQty) || 0
  const totalNumber =
    totalOverride !== null && totalOverride !== ''
      ? Number(totalOverride) || 0
      : plannedNumber + bufferNumber

  function handleProductChange(nextProductId: string) {
    if (createdBatchId) return
    setProductId(nextProductId)
    const nextProduct = products.find((item) => item.productId === nextProductId)
    setSteps(
      (nextProduct?.processSteps ?? []).map((item) => ({
        key: draftKey(),
        processStepName: item.name,
        machineId: item.machineId ?? '',
      })),
    )
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    if (!productId) {
      setError('Select an order line / product.')
      return
    }
    if (!batchNo.trim()) {
      setError('Production batch ID is required.')
      return
    }
    const qty = Number(quantity)
    if (!Number.isInteger(qty) || qty < 1) {
      setError('Planned quantity must be a whole number of at least 1.')
      return
    }
    if (qty > remaining) {
      setError(
        remaining <= 0
          ? 'All quantity for this order line is already allocated to batches.'
          : `Only ${remaining} pcs remaining for this order line.`,
      )
      return
    }
    if (!targetDate) {
      setError('Target dispatch date is required.')
      return
    }
    const priorityApi: OrderPriorityApi =
      priority === 'Urgent' ? 'URGENT' : priority === 'High' ? 'HIGH' : 'NORMAL'

    setSaving(true)
    try {
      let batchId = createdBatchId
      if (!batchId) {
        const response = await createBatchApi(orderId, {
          productId,
          deferSerials: true,
          status: 'OPEN',
          batchNo: batchNo.trim(),
          plannedQuantity: qty,
          bufferQty: bufferNumber,
          totalBatchQty: totalNumber,
          targetDispatchDate: targetDate,
          priority: priorityApi,
        })
        if (!response.success || !response.batch) {
          setError(response.message || 'Failed to create batch.')
          return
        }
        batchId = response.batch.id
        setCreatedBatchId(batchId)
      }

      if (steps.length > 0) {
        const stepsResponse = await updateBatchProcessStepsApi(orderId, batchId, {
          steps: steps.map((item, index) => ({
            processStepName: item.processStepName,
            sequence: index + 1,
            machineId: item.machineId || undefined,
          })),
        })
        if (!stepsResponse.success || !stepsResponse.batch) {
          setError(
            stepsResponse.message ||
              'Batch was created but process steps could not be saved. Submit again to retry.',
          )
          return
        }
      }

      navigate(`/orders/${orderId}`, { replace: true })
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : 'Failed to create batch.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <section className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-border bg-surface-raised p-5">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Create Batch</h2>
          <p className="mt-1 text-base text-muted">
            {order
              ? `Order ${order.orderNo}. Batch is created Open — you can still edit process steps and machine allocation from the order's Batches tab until you activate it.`
              : 'Create a production batch on a separate screen.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate(`/orders/${orderId}`)}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border px-4 text-sm font-bold hover:border-accent"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to order
        </button>
      </section>

      {error ? (
        <div className="rounded-xl border border-danger/30 bg-red-50 px-4 py-3 text-sm font-medium text-danger">
          {error}
        </div>
      ) : null}

      {loading ? (
        <p className="text-muted">Loading order…</p>
      ) : order ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <section className={sectionClass}>
            <h3 className={sectionTitleClass}>1. Header Information</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-1.5">
                <span className={labelClass}>Order</span>
                <input
                  value={`${order.orderNo}${order.customerName ? ` — ${order.customerName}` : ''}`}
                  disabled
                  className={`${fieldClass} opacity-70`}
                />
              </label>
              <label className="block space-y-1.5">
                <span className={labelClass}>Prod Batch ID</span>
                <input
                  value={batchNo}
                  onChange={(event) => setBatchNo(event.target.value)}
                  className={fieldClass}
                />
              </label>
              <label className="block space-y-1.5 sm:col-span-2">
                <span className={labelClass}>Order Line / Product</span>
                <select
                  value={productId}
                  onChange={(event) => handleProductChange(event.target.value)}
                  disabled={Boolean(createdBatchId)}
                  className={`${fieldClass} ${createdBatchId ? 'opacity-70' : ''}`}
                >
                  {products.map((item) => (
                    <option key={item.productId} value={item.productId}>
                      {item.productName} ({item.quantity})
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          <section className={sectionClass}>
            <h3 className={sectionTitleClass}>2. Define Quantity</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-1.5">
                <span className={labelClass}>Planned Quantity</span>
                <input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  className={fieldClass}
                />
                <p className="text-sm text-muted">{remaining} pcs remaining on this order line</p>
              </label>
              <label className="block space-y-1.5">
                <span className={labelClass}>Buffer Quantity</span>
                <input
                  type="number"
                  min={0}
                  value={bufferQty}
                  onChange={(event) => setBufferQty(event.target.value)}
                  className={fieldClass}
                />
              </label>
              <label className="block space-y-1.5">
                <span className={labelClass}>Total Batch Quantity</span>
                <input
                  type="number"
                  min={1}
                  value={totalOverride ?? String(totalNumber)}
                  onChange={(event) => setTotalOverride(event.target.value)}
                  className={fieldClass}
                />
                <p className="text-sm text-muted">
                  Defaults to Planned + Buffer. Override if you need a different total.
                </p>
              </label>
              <label className="block space-y-1.5">
                <span className={labelClass}>Target Dispatch Date</span>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(event) => setTargetDate(event.target.value)}
                  className={fieldClass}
                />
              </label>
              <label className="block space-y-1.5">
                <span className={labelClass}>Priority</span>
                <select
                  value={priority}
                  onChange={(event) =>
                    setPriority(event.target.value as 'Normal' | 'High' | 'Urgent')
                  }
                  className={fieldClass}
                >
                  <option value="Normal">Normal</option>
                  <option value="High">High</option>
                  <option value="Urgent">Urgent</option>
                </select>
              </label>
            </div>
          </section>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="min-h-12 rounded-xl bg-accent px-8 text-base font-bold text-white disabled:opacity-70"
            >
              {saving ? 'Saving…' : 'Create Batch'}
            </button>
          </div>
        </form>
      ) : null}
    </div>
  )
}
