import { Fragment, useEffect, useMemo, useState, type FormEvent } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { createBatchApi, fetchBatchesApi } from '../lib/api/batches'
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

function formatDate(value: string | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toISOString().slice(0, 10)
}

function nextBatchNo(batches: ProductionBatch[]): string {
  let max = 0
  for (const batch of batches) {
    const match = batch.batchNo.match(/(\d+)\s*$/)
    if (match) max = Math.max(max, Number(match[1]))
  }
  return `B${String(max + 1).padStart(2, '0')}`
}

function priorityLabel(value: string): string {
  if (value === 'CRITICAL' || value === 'URGENT') return 'Urgent'
  if (value === 'HIGH') return 'High'
  return 'Normal'
}

function serialStatusLabel(status: string): string {
  if (status === 'IN_PROGRESS') return 'In Progress'
  if (status === 'COMPLETED') return 'Completed'
  if (status === 'ON_HOLD') return 'On Hold'
  return 'Queued'
}

function serialStatusClass(status: string): string {
  if (status === 'COMPLETED') return 'bg-emerald-100 text-emerald-800'
  if (status === 'IN_PROGRESS') return 'bg-sky-100 text-sky-800'
  if (status === 'ON_HOLD') return 'bg-amber-100 text-amber-800'
  return 'bg-slate-100 text-slate-700'
}

function serialRange(batch: ProductionBatch): string {
  const serials = batch.serials ?? []
  if (serials.length === 0) return '—'
  const first = serials[0]?.serialNumber
  const last = serials[serials.length - 1]?.serialNumber
  if (!first) return '—'
  if (serials.length === 1 || first === last) return first
  return `${first} → ${last}`
}

export function OrderBatches({
  order,
  canEdit,
}: {
  order: ProductionOrder
  canEdit: boolean
}) {
  const products = order.products ?? []
  const [batches, setBatches] = useState<ProductionBatch[]>([])
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [expandedBatchId, setExpandedBatchId] = useState<string | null>(null)

  const [productId, setProductId] = useState(products[0]?.productId ?? '')
  const [processStepName, setProcessStepName] = useState('')
  const [batchNo, setBatchNo] = useState('B01')
  const [quantity, setQuantity] = useState('')
  const [targetDate, setTargetDate] = useState(todayIsoDate())
  const [priority, setPriority] = useState<'Normal' | 'High' | 'Urgent'>('Normal')

  const selectedProduct = products.find((item) => item.productId === productId)
  const steps = selectedProduct?.processSteps ?? []

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const batchRes = await fetchBatchesApi(order.id)
        if (!active) return
        const nextBatches = batchRes.batches ?? []
        setBatches(nextBatches)
        setBatchNo(nextBatchNo(nextBatches))
      } catch (loadError) {
        if (!active) return
        setError(
          loadError instanceof Error ? loadError.message : 'Failed to load batches.',
        )
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [order.id])

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

  async function handleCreate(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setMessage(null)
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
      const response = await createBatchApi(order.id, {
        productId,
        processStepName: processStepName || undefined,
        batchNo: batchNo.trim(),
        plannedQuantity: qty,
        targetDispatchDate: targetDate,
        priority: priorityApi,
      })
      if (!response.success || !response.batch) {
        setError(response.message || 'Failed to create batch.')
        return
      }
      const next = [...batches, response.batch]
      setBatches(next)
      setQuantity('')
      setBatchNo(nextBatchNo(next))
      setExpandedBatchId(response.batch.id)
      setMessage(
        response.message ||
          `Batch ${response.batch.batchNo} created with ${response.batch.serials?.length ?? qty} serial numbers.`,
      )
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
      {canEdit ? (
        <section className="rounded-2xl border border-border bg-surface-raised p-5">
          <h3 className="mb-1 text-lg font-bold">Create Batch</h3>
          <p className="mb-4 text-sm text-muted">
            Serial numbers are generated for the planned quantity so employees can take
            them up and update status later.
          </p>
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

      {error ? (
        <div className="rounded-xl border border-danger/30 bg-red-50 px-4 py-3 text-sm font-medium text-danger">
          {error}
        </div>
      ) : null}
      {message ? (
        <div className="rounded-xl border border-accent/30 bg-accent-soft px-4 py-3 text-sm font-semibold text-accent">
          {message}
        </div>
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-border bg-surface-raised">
        <div className="border-b border-border px-5 py-4">
          <h3 className="text-lg font-bold">Batches</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-surface-muted text-xs font-bold uppercase tracking-wide text-muted">
              <tr>
                <th className="w-10 px-3 py-3">
                  <span className="sr-only">Expand</span>
                </th>
                <th className="px-4 py-3">Batch No</th>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Process Step</th>
                <th className="px-4 py-3">Qty</th>
                <th className="px-4 py-3">Serials</th>
                <th className="px-4 py-3">Dispatch Date</th>
                <th className="px-4 py-3">Priority</th>
              </tr>
            </thead>
            <tbody>
              {batches.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted">
                    No batches yet.
                  </td>
                </tr>
              ) : (
                batches.map((batch) => {
                  const serials = batch.serials ?? []
                  const expanded = expandedBatchId === batch.id
                  const canExpand = serials.length > 0
                  return (
                    <Fragment key={batch.id}>
                      <tr
                        className={`border-t border-border ${
                          canExpand ? 'cursor-pointer hover:bg-surface-muted/60' : ''
                        }`}
                        onClick={() => {
                          if (!canExpand) return
                          setExpandedBatchId(expanded ? null : batch.id)
                        }}
                      >
                        <td className="px-3 py-3">
                          {canExpand ? (
                            <button
                              type="button"
                              aria-expanded={expanded}
                              aria-label={
                                expanded
                                  ? `Hide serials for ${batch.batchNo}`
                                  : `View serials for ${batch.batchNo}`
                              }
                              onClick={(event) => {
                                event.stopPropagation()
                                setExpandedBatchId(expanded ? null : batch.id)
                              }}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-surface-muted hover:text-foreground"
                            >
                              {expanded ? (
                                <ChevronDown className="h-5 w-5" aria-hidden />
                              ) : (
                                <ChevronRight className="h-5 w-5" aria-hidden />
                              )}
                            </button>
                          ) : (
                            <span className="inline-block h-8 w-8" />
                          )}
                        </td>
                        <td className="px-4 py-3 font-bold text-accent">
                          {batch.batchNo}
                        </td>
                        <td className="px-4 py-3">{batch.productName || '—'}</td>
                        <td className="px-4 py-3">
                          {batch.processStepName || 'Whole product'}
                        </td>
                        <td className="px-4 py-3">{batch.plannedQuantity}</td>
                        <td className="px-4 py-3">
                          {serials.length === 0 ? (
                            '—'
                          ) : (
                            <span className="font-semibold text-accent">
                              {serials.length} pcs
                              <span className="mt-0.5 block font-mono text-xs font-medium text-muted">
                                {serialRange(batch)}
                              </span>
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {formatDate(batch.targetDispatchDate)}
                        </td>
                        <td className="px-4 py-3">{priorityLabel(batch.priority)}</td>
                      </tr>
                      {expanded ? (
                        <tr className="border-t border-border bg-surface-muted/50">
                          <td colSpan={8} className="px-4 py-3">
                            <div className="max-h-72 overflow-auto rounded-xl border border-border bg-surface-raised">
                              <table className="min-w-full text-left text-sm">
                                <thead className="bg-surface-muted text-xs font-bold uppercase tracking-wide text-muted">
                                  <tr>
                                    <th className="px-3 py-2">#</th>
                                    <th className="px-3 py-2">Serial Number</th>
                                    <th className="px-3 py-2">Status</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {serials.map((serial) => (
                                    <tr
                                      key={serial.serialNumber}
                                      className="border-t border-border"
                                    >
                                      <td className="px-3 py-2 text-muted">
                                        {serial.sequence}
                                      </td>
                                      <td className="px-3 py-2 font-mono font-semibold">
                                        {serial.serialNumber}
                                      </td>
                                      <td className="px-3 py-2">
                                        <span
                                          className={`rounded-full px-2 py-0.5 text-xs font-bold ${serialStatusClass(serial.status)}`}
                                        >
                                          {serialStatusLabel(serial.status)}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
