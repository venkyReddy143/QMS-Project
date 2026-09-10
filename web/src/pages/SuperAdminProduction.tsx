import { Fragment, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { fetchAllBatchesApi } from '../lib/api/batches'
import type { ProductionBatch } from '../types/orders'

const NEW_STATUSES = new Set(['CREATED', 'SCHEDULED', 'RELEASED'])
const CLOSED_STATUSES = new Set(['DISPATCHED', 'COMPLETED'])
const ACTIVE_STATUSES = new Set([
  'ACTIVE',
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
  const [processBatchId, setProcessBatchId] = useState<string | null>(null)

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
          Production batches with team, machinery, and process-wise status.
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
                <th className="px-4 py-3">Prod Batch</th>
                <th className="px-4 py-3">Order ID</th>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Product Desc</th>
                <th className="px-4 py-3">Drawing Ref</th>
                <th className="px-4 py-3">Qty</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Production In Charge</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-muted">
                    Loading production…
                  </td>
                </tr>
              ) : visible.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-muted">
                    No production records found.
                  </td>
                </tr>
              ) : (
                visible.map((batch) => (
                  <Fragment key={batch.id}>
                    <tr className="border-t border-border align-top">
                      <td className="px-4 py-3 font-semibold">{batch.batchNo}</td>
                      <td className="px-4 py-3 font-bold text-accent">
                        {batch.orderNo || '—'}
                      </td>
                      <td className="px-4 py-3">{batch.productName || '—'}</td>
                      <td className="px-4 py-3">{batch.productDescription || '—'}</td>
                      <td className="px-4 py-3">{batch.drawingNumber || '—'}</td>
                      <td className="px-4 py-3">{batch.plannedQuantity}</td>
                      <td className="px-4 py-3">{statusLabel(batch.status)}</td>
                      <td className="px-4 py-3">
                        {batch.productionInCharge || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setProcessBatchId(
                                processBatchId === batch.id ? null : batch.id,
                              )
                            }
                            className="min-h-10 rounded-xl border border-border bg-surface-muted px-3 text-sm font-bold hover:border-accent"
                          >
                            View Process Steps
                          </button>
                          <button
                            type="button"
                            onClick={() => navigate(`/orders/${batch.orderId}`)}
                            className="min-h-10 rounded-xl border border-border bg-surface-muted px-3 text-sm font-bold hover:border-accent hover:text-accent"
                          >
                            Open
                          </button>
                        </div>
                      </td>
                    </tr>
                    {processBatchId === batch.id ? (
                      <tr className="border-t border-border bg-surface-muted/40">
                        <td colSpan={9} className="px-4 py-3">
                          <p className="mb-2 text-sm font-bold">
                            Process-wise consolidation — {batch.batchNo} (
                            {batch.processQtys?.total ?? batch.plannedQuantity} qty)
                          </p>
                          <table className="min-w-full text-left text-sm">
                            <thead>
                              <tr className="text-xs font-bold uppercase text-muted">
                                <th className="py-1 pr-4">Process Step</th>
                                <th className="py-1 pr-4">Sequence</th>
                                <th className="py-1 pr-4">Status</th>
                                <th className="py-1 pr-4">Queue</th>
                                <th className="py-1 pr-4">In Progress</th>
                                <th className="py-1 pr-4">QC Rejected</th>
                                <th className="py-1">Completed / Full Ready</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(batch.processQtys?.steps ?? []).length === 0 ? (
                                <tr>
                                  <td colSpan={7} className="py-2 text-muted">
                                    No process steps yet.
                                  </td>
                                </tr>
                              ) : (
                                (batch.processQtys?.steps ?? []).map((step) => (
                                  <tr key={step.name}>
                                    <td className="py-1 pr-4 font-semibold">{step.name}</td>
                                    <td className="py-1 pr-4">{step.sequence ?? '—'}</td>
                                    <td className="py-1 pr-4">{step.status ?? '—'}</td>
                                    <td className="py-1 pr-4">{step.queue}</td>
                                    <td className="py-1 pr-4">{step.inProgress}</td>
                                    <td className="py-1 pr-4">{step.qcRejected ?? 0}</td>
                                    <td className="py-1">
                                      {step.completed ?? step.fullReady ?? 0}
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                          <p className="mt-2 text-sm text-muted">
                            Not started: {batch.processQtys?.notStarted ?? 0} · QC
                            rejected: {batch.processQtys?.qcRejected ?? 0} · Full
                            ready: {batch.processQtys?.fullReady ?? 0}
                          </p>
                          <p className="mt-1 text-sm text-muted">
                            Machines:{' '}
                            {(batch.assignedMachines ?? []).length === 0
                              ? '—'
                              : (batch.assignedMachines ?? [])
                                  .map(
                                    (machine) =>
                                      machine.machineCode || machine.machineName,
                                  )
                                  .join(', ')}
                          </p>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
