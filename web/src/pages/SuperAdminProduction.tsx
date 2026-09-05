import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { fetchAllBatchesApi } from '../lib/api/batches'
import type { ProductionBatch } from '../types/orders'

const NEW_STATUSES = new Set(['SCHEDULED', 'RELEASED'])
const CLOSED_STATUSES = new Set(['DISPATCHED', 'COMPLETED'])
const ACTIVE_STATUSES = new Set([
  'IN_ASSEMBLY',
  'READY_FOR_QA',
  'QA_RELEASED',
  'PARTIALLY_DISPATCHED',
  'ON_HOLD',
])

function matchesView(status: string, view: string | undefined) {
  if (!view || view === 'all') return true
  if (view === 'new') return NEW_STATUSES.has(status)
  if (view === 'closed') return CLOSED_STATUSES.has(status)
  return ACTIVE_STATUSES.has(status)
}

function viewTitle(view: string | undefined) {
  if (view === 'new') return 'My Production — New'
  if (view === 'closed') return 'My Production — Closed'
  if (view === 'active') return 'My Production — Active'
  return 'My Production — All'
}

function statusLabel(status: string): string {
  return status
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function SuperAdminProduction() {
  const { view } = useParams()
  const navigate = useNavigate()
  const [batches, setBatches] = useState<ProductionBatch[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const response = await fetchAllBatchesApi()
        if (!active) return
        setBatches(response.batches ?? [])
      } catch (loadError) {
        if (!active) return
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Failed to load production.',
        )
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [])

  const visible = useMemo(
    () => batches.filter((batch) => matchesView(batch.status, view)),
    [batches, view],
  )

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-border bg-surface-raised p-5">
        <h2 className="text-2xl font-bold text-foreground">{viewTitle(view)}</h2>
        <p className="mt-1 text-base text-muted">
          Production batches across orders. Open a row to view the parent order.
        </p>
      </section>

      <section className="overflow-hidden rounded-2xl border border-border bg-surface-raised">
        {error ? (
          <p className="px-4 py-4 text-sm font-medium text-danger">{error}</p>
        ) : null}
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-base">
            <thead className="bg-surface-muted text-sm font-bold uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Batch</th>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Qty</th>
                <th className="px-4 py-3">Machines</th>
                <th className="px-4 py-3">Process qtys</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted">
                    Loading production…
                  </td>
                </tr>
              ) : visible.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted">
                    No production records found.
                  </td>
                </tr>
              ) : (
                visible.map((batch) => (
                  <tr key={batch.id} className="border-t border-border align-top">
                    <td className="px-4 py-3 font-bold text-accent">
                      {batch.orderNo || '—'}
                    </td>
                    <td className="px-4 py-3 font-semibold">{batch.batchNo}</td>
                    <td className="px-4 py-3">{batch.productName || '—'}</td>
                    <td className="px-4 py-3">{batch.plannedQuantity}</td>
                    <td className="px-4 py-3">
                      {(batch.assignedMachines ?? []).length === 0
                        ? '—'
                        : (batch.assignedMachines ?? [])
                            .map((machine) => machine.machineCode || machine.machineName)
                            .join(', ')}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <p>
                        Not started: {batch.processQtys?.notStarted ?? batch.plannedQuantity}
                      </p>
                      {(batch.processQtys?.steps ?? []).map((step) => (
                        <p key={step.name}>
                          {step.name}: {step.inProgress} in progress, {step.queue} queue
                        </p>
                      ))}
                    </td>
                    <td className="px-4 py-3">{statusLabel(batch.status)}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => navigate(`/orders/${batch.orderId}`)}
                        className="min-h-10 rounded-xl border border-border bg-surface-muted px-4 text-sm font-bold hover:border-accent hover:text-accent"
                      >
                        Open
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
