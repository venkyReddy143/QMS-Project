import { useMemo, useState, type FormEvent } from 'react'
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  FileDown,
  GitBranch,
  Layers3,
  Package,
  Pencil,
  Plus,
  Save,
  Trash2,
} from 'lucide-react'

type BatchStatus = 'Scheduled' | 'In-Assembly' | 'In-Progress' | 'Dispatched'
type Priority = 'Critical' | 'High' | 'Normal'

interface ScheduleBatch {
  id: string
  tag: string
  plannedQty: number
  targetDate: string
  status: BatchStatus
  progress: number
  priority: Priority
}

interface BatchFormState {
  tag: string
  plannedQty: string
  targetDate: string
  priority: Priority
}

const ORDER_TOTAL_QTY = 500

const INITIAL_BATCHES: ScheduleBatch[] = [
  {
    id: 'batch-1',
    tag: 'Batch 1',
    plannedQty: 100,
    targetDate: '2026-08-25',
    status: 'Dispatched',
    progress: 100,
    priority: 'Critical',
  },
  {
    id: 'batch-2',
    tag: 'Batch 2',
    plannedQty: 200,
    targetDate: '2026-09-05',
    status: 'In-Progress',
    progress: 45,
    priority: 'High',
  },
  {
    id: 'batch-3',
    tag: 'Batch 3',
    plannedQty: 200,
    targetDate: '2026-09-20',
    status: 'Scheduled',
    progress: 0,
    priority: 'Normal',
  },
]

const EMPTY_FORM: BatchFormState = {
  tag: '',
  plannedQty: '',
  targetDate: '',
  priority: 'Normal',
}

function statusStyles(status: BatchStatus): string {
  switch (status) {
    case 'Dispatched':
      return 'bg-emerald-500/15 text-success ring-1 ring-emerald-500/30'
    case 'In-Assembly':
    case 'In-Progress':
      return 'bg-amber-500/15 text-warning ring-1 ring-amber-500/30'
    case 'Scheduled':
    default:
      return 'bg-sky-500/15 text-accent ring-1 ring-sky-500/30'
  }
}

function progressBarColor(progress: number): string {
  if (progress >= 100) return 'bg-success'
  if (progress >= 40) return 'bg-industrial'
  return 'bg-accent'
}

function nextBatchTag(batches: ScheduleBatch[]): string {
  const max = batches.reduce((acc, batch) => {
    const match = batch.tag.match(/(\d+)/)
    return match ? Math.max(acc, Number(match[1])) : acc
  }, 0)
  return `Batch ${max + 1}`
}

export function DeliveryBatchScheduling() {
  const [batches, setBatches] = useState<ScheduleBatch[]>(INITIAL_BATCHES)
  const [form, setForm] = useState<BatchFormState>({
    ...EMPTY_FORM,
    tag: nextBatchTag(INITIAL_BATCHES),
  })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const allocatedQty = useMemo(
    () => batches.reduce((sum, batch) => sum + batch.plannedQty, 0),
    [batches],
  )
  const unallocatedQty = ORDER_TOTAL_QTY - allocatedQty
  const allocationPct = Math.min(
    100,
    Math.round((allocatedQty / ORDER_TOTAL_QTY) * 100),
  )

  const allocationState =
    unallocatedQty === 0
      ? {
          label: 'Fully Allocated',
          className: 'bg-emerald-500/15 text-success ring-1 ring-emerald-500/35',
          bar: 'bg-success',
        }
      : unallocatedQty > 0
        ? {
            label: 'Under Allocated',
            className: 'bg-amber-500/15 text-warning ring-1 ring-amber-500/35',
            bar: 'bg-industrial',
          }
        : {
            label: 'Over Allocated',
            className: 'bg-rose-500/15 text-danger ring-1 ring-rose-500/35',
            bar: 'bg-danger',
          }

  function showToast(message: string) {
    setToast(message)
    window.setTimeout(() => setToast(null), 2400)
  }

  function resetForm(nextTag?: string) {
    setForm({
      ...EMPTY_FORM,
      tag: nextTag ?? nextBatchTag(batches),
    })
    setEditingId(null)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const qty = Number(form.plannedQty)
    if (!form.tag.trim()) {
      showToast('Batch name is required.')
      return
    }
    if (!Number.isFinite(qty) || qty <= 0) {
      showToast('Planned quantity must be greater than zero.')
      return
    }
    if (!form.targetDate) {
      showToast('Target dispatch date is required.')
      return
    }

    if (editingId) {
      setBatches((current) =>
        current.map((batch) =>
          batch.id === editingId
            ? {
                ...batch,
                tag: form.tag.trim(),
                plannedQty: qty,
                targetDate: form.targetDate,
                priority: form.priority,
              }
            : batch,
        ),
      )
      showToast('Batch updated.')
      resetForm()
      return
    }

    const created: ScheduleBatch = {
      id: `batch-${crypto.randomUUID().slice(0, 8)}`,
      tag: form.tag.trim(),
      plannedQty: qty,
      targetDate: form.targetDate,
      status: 'Scheduled',
      progress: 0,
      priority: form.priority,
    }

    setBatches((current) => {
      const next = [...current, created]
      setForm({ ...EMPTY_FORM, tag: nextBatchTag(next) })
      return next
    })
    showToast('Delivery batch added.')
  }

  function handleEdit(batch: ScheduleBatch) {
    setEditingId(batch.id)
    setForm({
      tag: batch.tag,
      plannedQty: String(batch.plannedQty),
      targetDate: batch.targetDate,
      priority: batch.priority,
    })
  }

  function handleSplit(batch: ScheduleBatch) {
    if (batch.plannedQty < 2) {
      showToast('Cannot split a batch smaller than 2 pcs.')
      return
    }

    const firstQty = Math.floor(batch.plannedQty / 2)
    const secondQty = batch.plannedQty - firstQty

    setBatches((current) => {
      const without = current.filter((item) => item.id !== batch.id)
      const splitA: ScheduleBatch = {
        ...batch,
        id: `${batch.id}-a`,
        tag: `${batch.tag}A`,
        plannedQty: firstQty,
        status: batch.status === 'Dispatched' ? 'In-Progress' : batch.status,
        progress: Math.min(batch.progress, 50),
      }
      const splitB: ScheduleBatch = {
        ...batch,
        id: `${batch.id}-b`,
        tag: `${batch.tag}B`,
        plannedQty: secondQty,
        status: 'Scheduled',
        progress: 0,
        priority: batch.priority,
      }
      return [...without, splitA, splitB]
    })
    showToast(`${batch.tag} split into two delivery lots.`)
  }

  function handleDelete(batch: ScheduleBatch) {
    if (batch.status === 'Dispatched') {
      showToast('Dispatched batches cannot be deleted.')
      return
    }
    setBatches((current) => {
      const next = current.filter((item) => item.id !== batch.id)
      if (!editingId) {
        setForm((prev) => ({ ...prev, tag: nextBatchTag(next) }))
      }
      return next
    })
    if (editingId === batch.id) resetForm()
    showToast(`${batch.tag} removed from schedule.`)
  }

  return (
    <div className="space-y-5">
      {/* Active Order Context */}
      <section className="overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-sm shadow-black/5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface-muted/60 px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 text-accent ring-1 ring-accent/30">
              <Package className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
                Active Order Context
              </p>
              <p className="text-sm font-semibold text-foreground">
                Delivery Batch Scheduling
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-success ring-1 ring-emerald-500/30">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            In Production
          </span>
        </div>

        <div className="grid gap-4 px-5 py-4 sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted">
              Order ID
            </p>
            <p className="mt-1 font-mono text-base font-semibold text-accent">
              PO-2026-0041
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted">
              Product
            </p>
            <p className="mt-1 text-base font-semibold text-foreground">
              HP Stage-1 Rotor Blade
            </p>
            <p className="text-sm text-muted">TB-HP-001</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted">
              Total Quantity
            </p>
            <p className="mt-1 text-base font-semibold text-foreground">
              500 pcs
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted">
              Status
            </p>
            <p className="mt-1 text-base font-semibold text-foreground">
              In Production
            </p>
          </div>
        </div>
      </section>

      {/* Action Toolbar */}
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface-raised px-4 py-3 shadow-sm shadow-black/5">
        <div className="flex items-center gap-2 text-sm text-muted">
          <Layers3 className="h-4 w-4 text-industrial" />
          <span>
            Configure delivery lots for customer release windows before shop-floor
            release.
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => showToast('Schedule PDF export queued.')}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface-muted px-3.5 py-2 text-sm font-medium text-foreground transition hover:border-accent/40 hover:text-accent"
          >
            <FileDown className="h-4 w-4" />
            Export Schedule PDF
          </button>
          <button
            type="button"
            onClick={() => showToast('Batch configuration saved.')}
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-3.5 py-2 text-sm font-semibold text-white shadow-sm shadow-cyan-900/20 transition hover:brightness-110 dark:text-slate-950"
          >
            <Save className="h-4 w-4" />
            Save Batch Configuration
          </button>
        </div>
      </section>

      {/* Batch Splitter Panel */}
      <section className="rounded-2xl border border-border bg-surface-raised p-5 shadow-sm shadow-black/5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-industrial">
              Interactive Batch Splitter
            </p>
            <h2 className="mt-1 text-lg font-semibold text-foreground">
              {editingId ? 'Edit delivery batch' : 'Add new delivery batch'}
            </h2>
          </div>
          {editingId ? (
            <button
              type="button"
              onClick={() => resetForm()}
              className="text-sm font-medium text-muted underline-offset-2 hover:text-foreground hover:underline"
            >
              Cancel edit
            </button>
          ) : null}
        </div>

        <form
          onSubmit={handleSubmit}
          className="grid gap-3 md:grid-cols-2 xl:grid-cols-5"
        >
          <label className="block space-y-1.5 xl:col-span-1">
            <span className="text-xs font-medium uppercase tracking-wider text-muted">
              Batch Name
            </span>
            <input
              value={form.tag}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, tag: event.target.value }))
              }
              placeholder="Batch 4"
              className="w-full rounded-xl border border-border bg-surface-muted px-3 py-2.5 text-sm text-foreground outline-none ring-accent/30 transition focus:ring-2"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wider text-muted">
              Planned Qty
            </span>
            <input
              type="number"
              min={1}
              value={form.plannedQty}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, plannedQty: event.target.value }))
              }
              placeholder="e.g. 50"
              className="w-full rounded-xl border border-border bg-surface-muted px-3 py-2.5 text-sm text-foreground outline-none ring-accent/30 transition focus:ring-2"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wider text-muted">
              Target Dispatch Date
            </span>
            <input
              type="date"
              value={form.targetDate}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, targetDate: event.target.value }))
              }
              className="w-full rounded-xl border border-border bg-surface-muted px-3 py-2.5 text-sm text-foreground outline-none ring-accent/30 transition focus:ring-2"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wider text-muted">
              Priority
            </span>
            <select
              value={form.priority}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  priority: event.target.value as Priority,
                }))
              }
              className="w-full rounded-xl border border-border bg-surface-muted px-3 py-2.5 text-sm text-foreground outline-none ring-accent/30 transition focus:ring-2"
            >
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Normal">Normal</option>
            </select>
          </label>

          <div className="flex items-end">
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-foreground px-3.5 py-2.5 text-sm font-semibold text-surface transition hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              {editingId ? 'Update Batch' : 'Add Batch'}
            </button>
          </div>
        </form>

        {/* Real-time Validation Bar */}
        <div className="mt-5 rounded-2xl border border-border bg-surface-muted/70 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                Allocation Validation
              </p>
              <p className="text-sm text-foreground">
                Total Order Qty{' '}
                <span className="font-semibold">{ORDER_TOTAL_QTY}</span>
                <span className="mx-2 text-border">·</span>
                Allocated{' '}
                <span className="font-semibold">
                  {allocatedQty}/{ORDER_TOTAL_QTY}
                </span>{' '}
                <span className="text-muted">({allocationPct}%)</span>
                <span className="mx-2 text-border">·</span>
                Unallocated{' '}
                <span
                  className={`font-semibold ${
                    unallocatedQty < 0 ? 'text-danger' : 'text-foreground'
                  }`}
                >
                  {unallocatedQty} pcs
                </span>
              </p>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${allocationState.className}`}
            >
              {unallocatedQty === 0 ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <AlertTriangle className="h-3.5 w-3.5" />
              )}
              {allocationState.label}
            </span>
          </div>

          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-surface ring-1 ring-border/60">
            <div
              className={`h-full rounded-full transition-all duration-300 ${allocationState.bar}`}
              style={{
                width: `${Math.min(100, Math.abs(allocationPct))}%`,
              }}
            />
          </div>
        </div>
      </section>

      {/* Batch Table */}
      <section className="overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-sm shadow-black/5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Delivery Batch Schedule
            </h2>
            <p className="text-sm text-muted">
              {batches.length} lots configured against PO-2026-0041
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface-muted px-3 py-1.5 text-xs text-muted">
            <CalendarDays className="h-3.5 w-3.5" />
            Target windows through Sep 2026
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-muted/50 text-[11px] uppercase tracking-[0.12em] text-muted">
                <th className="px-5 py-3 font-semibold">Batch Tag</th>
                <th className="px-4 py-3 font-semibold">Target Date</th>
                <th className="px-4 py-3 font-semibold">Planned Qty</th>
                <th className="px-4 py-3 font-semibold">Current Status</th>
                <th className="min-w-[180px] px-4 py-3 font-semibold">
                  Progress
                </th>
                <th className="px-5 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((batch) => {
                const displayStatus =
                  batch.status === 'In-Progress' ? 'In-Assembly' : batch.status

                return (
                  <tr
                    key={batch.id}
                    className="border-b border-border/70 transition hover:bg-surface-muted/40"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">
                          {batch.tag}
                        </span>
                        <span className="rounded-md bg-surface-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
                          {batch.priority}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 tabular-nums text-foreground">
                      {batch.targetDate}
                    </td>
                    <td className="px-4 py-3.5 font-medium tabular-nums">
                      {batch.plannedQty}{' '}
                      <span className="text-muted">pcs</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles(
                          batch.status === 'In-Progress'
                            ? 'In-Assembly'
                            : batch.status,
                        )}`}
                      >
                        {displayStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-muted ring-1 ring-border/50">
                          <div
                            className={`h-full rounded-full ${progressBarColor(batch.progress)}`}
                            style={{ width: `${batch.progress}%` }}
                          />
                        </div>
                        <span className="w-10 text-right text-xs font-semibold tabular-nums text-muted">
                          {batch.progress}%
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          title="Edit"
                          onClick={() => handleEdit(batch)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface-muted text-muted transition hover:border-accent/40 hover:text-accent"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          title="Split"
                          onClick={() => handleSplit(batch)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface-muted text-muted transition hover:border-industrial/50 hover:text-industrial"
                        >
                          <GitBranch className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          title="Delete"
                          onClick={() => handleDelete(batch)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface-muted text-muted transition hover:border-danger/40 hover:text-danger"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {toast ? (
        <div className="fixed bottom-5 right-5 z-50 rounded-xl border border-border bg-surface-raised px-4 py-3 text-sm font-medium text-foreground shadow-lg shadow-black/20">
          {toast}
        </div>
      ) : null}
    </div>
  )
}
