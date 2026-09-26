import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { MoreVertical } from 'lucide-react'
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
  const [menuBatchId, setMenuBatchId] = useState<string | null>(null)
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(
    null,
  )
  const menuRef = useRef<HTMLDivElement | null>(null)
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  function openMenu(batchId: string) {
    if (menuBatchId === batchId) {
      setMenuBatchId(null)
      setMenuPos(null)
      return
    }
    const button = buttonRefs.current[batchId]
    if (!button) return
    const rect = button.getBoundingClientRect()
    const menuWidth = 176
    const menuHeight = 88
    const left = Math.min(
      rect.left,
      Math.max(8, window.innerWidth - menuWidth - 8),
    )
    const openUp = rect.bottom + menuHeight + 8 > window.innerHeight
    const top = openUp
      ? Math.max(8, rect.top - menuHeight - 4)
      : rect.bottom + 4
    setMenuPos({ top, left })
    setMenuBatchId(batchId)
  }

  function closeMenu() {
    setMenuBatchId(null)
    setMenuPos(null)
  }

  useEffect(() => {
    if (!menuBatchId) return
    const openBatchId = menuBatchId
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node
      if (menuRef.current?.contains(target)) return
      const openButton = buttonRefs.current[openBatchId]
      if (openButton?.contains(target)) return
      closeMenu()
    }
    function handleReposition() {
      const button = buttonRefs.current[openBatchId]
      if (!button) {
        closeMenu()
        return
      }
      const rect = button.getBoundingClientRect()
      const menuWidth = 176
      const menuHeight = 88
      const left = Math.min(
        rect.left,
        Math.max(8, window.innerWidth - menuWidth - 8),
      )
      const openUp = rect.bottom + menuHeight + 8 > window.innerHeight
      const top = openUp
        ? Math.max(8, rect.top - menuHeight - 4)
        : rect.bottom + 4
      setMenuPos({ top, left })
    }
    document.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('resize', handleReposition)
    window.addEventListener('scroll', handleReposition, true)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('resize', handleReposition)
      window.removeEventListener('scroll', handleReposition, true)
    }
  }, [menuBatchId])

  useEffect(() => {
    closeMenu()
  }, [view])

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

  const menuBatch = visible.find((batch) => batch.id === menuBatchId)

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-border bg-surface-raised p-5">
        <h2 className="text-2xl font-bold text-foreground">{viewTitle(view)}</h2>
        <p className="mt-1 text-base text-muted">
          Production batches with team, machinery, and process-wise status.
        </p>
      </section>

      <section className="rounded-2xl border border-border bg-surface-raised">
        {error ? (
          <p className="px-4 py-4 text-sm font-medium text-danger">{error}</p>
        ) : null}
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-base">
            <thead className="bg-surface-muted text-sm font-bold uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Actions</th>
                <th className="px-4 py-3">Prod Batch</th>
                <th className="px-4 py-3">Order ID</th>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Product Desc</th>
                <th className="px-4 py-3">Drawing Ref</th>
                <th className="px-4 py-3">Qty</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Production In Charge</th>
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
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          ref={(node) => {
                            buttonRefs.current[batch.id] = node
                          }}
                          onClick={() => openMenu(batch.id)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface-muted text-foreground hover:border-accent hover:text-accent"
                          aria-label={`Actions for ${batch.batchNo}`}
                          aria-expanded={menuBatchId === batch.id}
                          aria-haspopup="menu"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </td>
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
                            {(batch.processMachines ?? []).length > 0
                              ? (batch.processMachines ?? [])
                                  .map((item) => {
                                    const machine =
                                      item.machineCode || item.machineName || '—'
                                    return `${item.processStepName}: ${machine}`
                                  })
                                  .join(', ')
                              : (batch.assignedMachines ?? []).length === 0
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

      {menuBatch && menuPos
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              style={{ top: menuPos.top, left: menuPos.left }}
              className="fixed z-[100] min-w-[11rem] overflow-hidden rounded-xl border border-border bg-surface-raised py-1 shadow-lg"
            >
              <button
                type="button"
                role="menuitem"
                className="block w-full px-3 py-2 text-left text-sm font-semibold hover:bg-surface-muted"
                onClick={() => {
                  setProcessBatchId(
                    processBatchId === menuBatch.id ? null : menuBatch.id,
                  )
                  closeMenu()
                }}
              >
                View Process Steps
              </button>
              <button
                type="button"
                role="menuitem"
                className="block w-full px-3 py-2 text-left text-sm font-semibold hover:bg-surface-muted"
                onClick={() => {
                  closeMenu()
                  navigate(`/orders/${menuBatch.orderId}`)
                }}
              >
                Open
              </button>
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
