import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Play } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import {
  getEmployeeName,
  serialStatusClass,
  useOrders,
} from '../context/OrdersContext'
import { SERIAL_NUMBER_CONFIG } from '../lib/serialNumber'

export function OrderDetail() {
  const { orderId = '' } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const {
    getOrder,
    startOrder,
    createBatches,
    getAllocatedQty,
    serialFormatExample,
    employees,
  } = useOrders()
  const order = getOrder(orderId)
  const [message, setMessage] = useState<string | null>(null)
  const [batchQtyText, setBatchQtyText] = useState('100,200,200')
  const [expandedBatchId, setExpandedBatchId] = useState<string | null>(null)

  const batchStats = useMemo(() => {
    if (!order) return { completed: 0, inProgress: 0, disputed: 0 }
    let completed = 0
    let inProgress = 0
    let disputed = 0
    for (const batch of order.batches) {
      for (const serial of batch.serials) {
        if (serial.status === 'Completed') completed += 1
        if (serial.status === 'In Progress') inProgress += 1
        if (serial.status === 'Disputed') disputed += 1
      }
    }
    return { completed, inProgress, disputed }
  }, [order])

  if (!order) {
    return (
      <div className="rounded-2xl border border-border bg-surface-raised p-6">
        <p className="text-lg font-bold">Order not found</p>
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

  const allocated = getAllocatedQty(order)

  function handleStart() {
    if (!user || !order) return
    const result = startOrder(order.id, user.name)
    setMessage(result.message)
  }

  function handleCreateBatches() {
    if (!order) return
    const quantities = batchQtyText
      .split(/[,\s]+/)
      .map((part) => Number(part.trim()))
      .filter((value) => Number.isFinite(value))
    const result = createBatches(order.id, quantities)
    setMessage(result.message)
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => navigate('/orders')}
        className="inline-flex items-center gap-2 text-sm font-bold text-accent"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Orders List
      </button>

      <section className="rounded-2xl border border-border bg-surface-raised p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-muted">Order Detail</p>
            <h2 className="text-2xl font-bold text-foreground">{order.id}</h2>
            <p className="mt-1 text-base text-muted">
              {order.customer} · {order.product}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(order.status === 'Created' || order.status === 'Planned') && (
              <button
                type="button"
                onClick={handleStart}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-bold text-white"
              >
                <Play className="h-4 w-4" />
                Start Order
              </button>
            )}
            <Link
              to="/production-planning"
              className="inline-flex min-h-11 items-center rounded-xl border border-border bg-surface-muted px-4 text-sm font-bold"
            >
              Shift Work Update
            </Link>
            <Link
              to="/my-tasks"
              className="inline-flex min-h-11 items-center rounded-xl border border-border bg-surface-muted px-4 text-sm font-bold"
            >
              Manager Reviews
            </Link>
          </div>
        </div>

        {message ? (
          <div className="mt-4 rounded-xl border border-accent/30 bg-accent-soft px-3 py-3 text-sm font-semibold text-accent">
            {message}
          </div>
        ) : null}

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-border bg-surface-muted p-3">
            <p className="text-xs font-semibold text-muted">Status</p>
            <p className="mt-1 font-bold">{order.status}</p>
          </div>
          <div className="rounded-xl border border-border bg-surface-muted p-3">
            <p className="text-xs font-semibold text-muted">Order Qty</p>
            <p className="mt-1 font-bold">{order.qty} pcs</p>
          </div>
          <div className="rounded-xl border border-border bg-surface-muted p-3">
            <p className="text-xs font-semibold text-muted">Serial Progress</p>
            <p className="mt-1 font-bold">
              {batchStats.completed} done · {batchStats.inProgress} in progress
            </p>
          </div>
          <div className="rounded-xl border border-border bg-surface-muted p-3">
            <p className="text-xs font-semibold text-muted">Disputes</p>
            <p className="mt-1 font-bold text-warning">{batchStats.disputed}</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface-raised p-5">
        <h3 className="text-lg font-bold">Create Batches + Serial Numbers</h3>
        <p className="mt-1 text-sm text-muted">
          Manager splits order qty into batches first. A batch is shared — many
          employees and shifts can work pieces inside it.
        </p>
        <p className="mt-2 text-xs font-semibold text-accent">
          Serial format ({SERIAL_NUMBER_CONFIG.pattern}): {serialFormatExample}
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
          <label className="block space-y-1.5">
            <span className="text-sm font-bold">
              Batch quantities (must total {order.qty})
            </span>
            <input
              value={batchQtyText}
              onChange={(event) => setBatchQtyText(event.target.value)}
              placeholder="e.g. 100,200,200"
              className="min-h-12 w-full rounded-xl border border-border bg-surface-muted px-3 text-base"
            />
          </label>
          <div className="flex items-end">
            <button
              type="button"
              onClick={handleCreateBatches}
              className="min-h-12 w-full rounded-xl bg-foreground px-5 text-sm font-bold text-white md:w-auto"
            >
              Create Batches & Serials
            </button>
          </div>
        </div>

        <p className="mt-3 text-sm font-semibold text-muted">
          Allocated {allocated}/{order.qty}
        </p>

        <div className="mt-4 space-y-3">
          {order.batches.length === 0 ? (
            <p className="rounded-xl bg-surface-muted px-4 py-3 text-sm text-muted">
              No batches yet. Create batches before shift work updates.
            </p>
          ) : (
            order.batches.map((batch) => {
              const done = batch.serials.filter((s) => s.status === 'Completed').length
              const wip = batch.serials.filter((s) => s.status === 'In Progress').length
              return (
                <div
                  key={batch.id}
                  className="rounded-xl border border-border bg-surface-muted/40 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-bold">
                        {batch.tag} · {batch.quantity} pcs
                      </p>
                      <p className="text-sm text-muted">
                        {done} completed · {wip} in progress · shared across shifts
                      </p>
                      <p className="mt-1 font-mono text-xs text-accent">
                        {batch.serials[0]?.serialNumber} →{' '}
                        {batch.serials[batch.serials.length - 1]?.serialNumber}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedBatchId(
                          expandedBatchId === batch.id ? null : batch.id,
                        )
                      }
                      className="min-h-10 rounded-xl border border-border bg-surface-raised px-3 text-sm font-bold"
                    >
                      {expandedBatchId === batch.id ? 'Hide Serials' : 'View Serials'}
                    </button>
                  </div>

                  {expandedBatchId === batch.id ? (
                    <div className="mt-3 max-h-56 overflow-y-auto rounded-xl border border-border bg-surface-raised p-3">
                      <div className="space-y-1">
                        {batch.serials.slice(0, 40).map((serial) => (
                          <div
                            key={serial.id}
                            className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 py-1.5 text-sm"
                          >
                            <span className="font-mono text-xs">
                              {serial.serialNumber}
                            </span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-bold ${serialStatusClass(serial.status)}`}
                            >
                              {serial.status}
                              {serial.status === 'In Progress'
                                ? ` ${serial.progressPercent}%`
                                : ''}
                            </span>
                            <span className="text-xs text-muted">
                              {getEmployeeName(employees, serial.lastEmployeeId)}
                              {serial.lastShift ? ` · Shift ${serial.lastShift}` : ''}
                            </span>
                          </div>
                        ))}
                        {batch.serials.length > 40 ? (
                          <p className="pt-2 text-xs text-muted">
                            Showing first 40 of {batch.serials.length} serials
                          </p>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </div>
              )
            })
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface-raised p-5">
        <h3 className="text-lg font-bold">Process Route (reference)</h3>
        <p className="mt-1 text-sm text-muted">
          Product process steps for planning. Daily work is tracked on serials
          inside batches.
        </p>
        <ol className="mt-3 space-y-2">
          {order.steps.map((step) => (
            <li
              key={step.id}
              className="rounded-xl border border-border bg-surface-muted px-3 py-2 text-sm font-semibold"
            >
              {step.sequence}. {step.name} ({step.standardHours.toFixed(2)}h/pc)
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}
