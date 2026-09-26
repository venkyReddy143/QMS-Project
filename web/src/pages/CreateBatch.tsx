import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { fetchAdminMachinesApi } from '../lib/api/admin'
import { createBatchApi, fetchBatchesApi } from '../lib/api/batches'
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

function todayIsoDate(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

function machinesForProduct(
  steps: Array<{ name: string; machineId?: string }>,
): Record<string, string> {
  return Object.fromEntries(steps.map((step) => [step.name, step.machineId ?? '']))
}

function nextBatchNo(batches: ProductionBatch[]): string {
  let max = 0
  for (const batch of batches) {
    const match = batch.batchNo.match(/(\d+)\s*$/)
    if (match) max = Math.max(max, Number(match[1]))
  }
  return `B${String(max + 1).padStart(2, '0')}`
}

export function CreateBatch() {
  const { orderId = '' } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [order, setOrder] = useState<ProductionOrder | null>(null)
  const [batches, setBatches] = useState<ProductionBatch[]>([])
  const [machines, setMachines] = useState<AdminMachine[]>([])
  const [productId, setProductId] = useState('')
  const [processStepName, setProcessStepName] = useState('')
  const [stepMachines, setStepMachines] = useState<Record<string, string>>({})
  const [batchNo, setBatchNo] = useState('B01')
  const [quantity, setQuantity] = useState('')
  const [targetDate, setTargetDate] = useState(todayIsoDate())
  const [priority, setPriority] = useState<'Normal' | 'High' | 'Urgent'>('Normal')
  const [productionInCharge, setProductionInCharge] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

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
        setStepMachines(machinesForProduct(firstProduct?.processSteps ?? []))
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
  const steps = selectedProduct?.processSteps ?? []
  const machinesForBatch = processStepName
    ? steps.filter((step) => step.name === processStepName)
    : steps

  const remaining = useMemo(() => {
    if (!selectedProduct) return 0
    const allocated = batches
      .filter(
        (batch) =>
          batch.productId === selectedProduct.productId &&
          (batch.processStepName || '') === processStepName,
      )
      .reduce((sum, batch) => sum + batch.plannedQuantity, 0)
    return Math.max(0, selectedProduct.quantity - allocated)
  }, [batches, processStepName, selectedProduct])

  useEffect(() => {
    setStepMachines(machinesForProduct(selectedProduct?.processSteps ?? []))
  }, [selectedProduct?.productId])

  async function handleCreate(event: FormEvent) {
    event.preventDefault()
    setError(null)
    const qty = Number(quantity)
    if (!productId) {
      setError('Select a product.')
      return
    }
    if (!batchNo.trim()) {
      setError('Batch number is required.')
      return
    }
    if (!Number.isInteger(qty) || qty < 1) {
      setError('Planned quantity must be a whole number of at least 1.')
      return
    }
    if (qty > remaining) {
      setError(
        remaining <= 0
          ? 'All quantity for this product / step is already in batches.'
          : `Only ${remaining} pcs remaining.`,
      )
      return
    }

    const priorityApi: OrderPriorityApi =
      priority === 'Urgent' ? 'URGENT' : priority === 'High' ? 'HIGH' : 'NORMAL'

    setSaving(true)
    try {
      const stepsForBatch = processStepName
        ? steps.filter((step) => step.name === processStepName)
        : steps
      const missingMachine = stepsForBatch.find(
        (step) => !stepMachines[step.name],
      )
      if (stepsForBatch.length > 0 && missingMachine) {
        setError(`Select a machine for ${missingMachine.name}.`)
        setSaving(false)
        return
      }

      const response = await createBatchApi(orderId, {
        productId,
        processStepName: processStepName || undefined,
        processMachines: stepsForBatch.map((step, index) => ({
          processStepName: step.name,
          sequence: step.sequence ?? index + 1,
          machineId: stepMachines[step.name],
        })),
        deferSerials: true,
        status: 'CREATED',
        productionInCharge: productionInCharge.trim(),
        batchNo: batchNo.trim(),
        plannedQuantity: qty,
        targetDispatchDate: targetDate,
        priority: priorityApi,
      })
      if (!response.success || !response.batch) {
        setError(response.message || 'Failed to create batch.')
        return
      }
      navigate(`/orders/${orderId}`, { replace: true })
    } catch (createError) {
      setError(
        createError instanceof Error ? createError.message : 'Failed to create batch.',
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
              ? `Order ${order.orderNo}. Serial numbers are generated for the planned quantity.`
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
        <section className="rounded-2xl border border-border bg-surface-raised p-5">
          <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1.5">
              <span className={labelClass}>Product</span>
              <select
                value={productId}
                onChange={(event) => {
                  setProductId(event.target.value)
                  setProcessStepName('')
                }}
                className={fieldClass}
              >
                {products.map((item) => (
                  <option key={item.productId} value={item.productId}>
                    {item.productName} ({item.quantity})
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1.5">
              <span className={labelClass}>Process Step</span>
              <select
                value={processStepName}
                onChange={(event) => setProcessStepName(event.target.value)}
                className={fieldClass}
              >
                <option value="">Whole product</option>
                {steps.map((step) => (
                  <option key={step.name} value={step.name}>
                    {step.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="space-y-3 sm:col-span-2">
              <span className={labelClass}>Machine by process step</span>
              {machinesForBatch.length === 0 ? (
                <p className="rounded-xl border border-border bg-surface-muted px-3 py-3 text-sm text-muted">
                  Save process steps on the order before assigning machines.
                </p>
              ) : (
                machinesForBatch.map((step) => (
                  <label key={step.name} className="block space-y-1.5">
                    <span className="text-sm font-semibold text-foreground">
                      {step.name}
                    </span>
                    <select
                      value={stepMachines[step.name] ?? ''}
                      onChange={(event) =>
                        setStepMachines((current) => ({
                          ...current,
                          [step.name]: event.target.value,
                        }))
                      }
                      className={fieldClass}
                    >
                      <option value="">Select machine</option>
                      {machines.map((machine) => (
                        <option key={machine.id} value={machine.id}>
                          {machine.machineCode} — {machine.name}
                        </option>
                      ))}
                    </select>
                  </label>
                ))
              )}
            </div>
            <label className="block space-y-1.5">
              <span className={labelClass}>Batch No</span>
              <input
                value={batchNo}
                onChange={(event) => setBatchNo(event.target.value)}
                className={fieldClass}
              />
            </label>
            <label className="block space-y-1.5">
              <span className={labelClass}>Planned Quantity</span>
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                className={fieldClass}
              />
              <p className="text-sm text-muted">{remaining} pcs remaining</p>
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
            <label className="block space-y-1.5 sm:col-span-2">
              <span className={labelClass}>Production In Charge</span>
              <input
                value={productionInCharge}
                onChange={(event) => setProductionInCharge(event.target.value)}
                className={fieldClass}
                placeholder="Person responsible for this batch"
              />
            </label>
            <p className="sm:col-span-2 text-sm text-muted">
              Batch is created with status Created. Activate the batch later to
              generate serial numbers and first-process records.
            </p>
            <div className="sm:col-span-2 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="min-h-12 rounded-xl bg-accent px-8 text-base font-bold text-white disabled:opacity-70"
              >
                {saving ? 'Saving…' : 'Create Batch'}
              </button>
            </div>
          </form>
        </section>
      ) : null}
    </div>
  )
}
