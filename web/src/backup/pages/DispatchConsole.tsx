import { Fragment, useMemo, useState, type FormEvent } from 'react'
import {
  ChevronDown,
  ChevronRight,
  FileUp,
  PackageCheck,
  Paperclip,
  Receipt,
  Send,
  Truck,
  X,
} from 'lucide-react'

interface PendingBatch {
  id: string
  tag: string
  readyQty: number
  packedDate: string
  location: string
  qualityStatus: 'Released' | 'Hold'
}

interface DispatchLineItem {
  partCode: string
  description: string
  qty: number
}

interface DispatchRecord {
  id: string
  batchTag: string
  dispatchedQty: number
  dispatchDateTime: string
  invoiceNumber: string
  vehicle: string
  transporter: string
  driverName: string
  driverContact: string
  documentName: string
  trackingStatus: string
  status: 'Dispatched & In-Transit' | 'Delivered'
  lineItems: DispatchLineItem[]
}

interface DispatchFormState {
  batchId: string
  dispatchedQty: string
  dispatchDateTime: string
  invoiceNumber: string
  vehicleDetails: string
  driverName: string
  driverContact: string
  documentName: string
}

const ORDER_TOTAL_QTY = 500

const INITIAL_PENDING: PendingBatch[] = [
  {
    id: 'pending-batch-2',
    tag: 'Batch 2',
    readyQty: 200,
    packedDate: '2026-09-04',
    location: 'Dispatch Bay D-02',
    qualityStatus: 'Released',
  },
  {
    id: 'pending-batch-3',
    tag: 'Batch 3',
    readyQty: 200,
    packedDate: '2026-09-18',
    location: 'Staging Rack S-11',
    qualityStatus: 'Released',
  },
]

const INITIAL_HISTORY: DispatchRecord[] = [
  {
    id: 'disp-1',
    batchTag: 'Batch 1',
    dispatchedQty: 100,
    dispatchDateTime: '2026-08-25T09:30',
    invoiceNumber: 'INV-2026-8801',
    vehicle: 'TS-09-EQ-4421',
    transporter: 'VRL Logistics',
    driverName: 'M. Reddy',
    driverContact: '+91 98765 44120',
    documentName: 'BOL-8801.pdf',
    trackingStatus: 'En route to AeroDyn Hub — Hyderabad',
    status: 'Dispatched & In-Transit',
    lineItems: [
      {
        partCode: 'TB-HP-001',
        description: 'HP Stage-1 Rotor Blade',
        qty: 100,
      },
    ],
  },
]

function formatDisplayDateTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function DispatchConsole() {
  const [pendingBatches, setPendingBatches] =
    useState<PendingBatch[]>(INITIAL_PENDING)
  const [history, setHistory] = useState<DispatchRecord[]>(INITIAL_HISTORY)
  const [expandedIds, setExpandedIds] = useState<string[]>(['disp-1'])
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [form, setForm] = useState<DispatchFormState>({
    batchId: '',
    dispatchedQty: '',
    dispatchDateTime: '2026-09-05T10:00',
    invoiceNumber: 'INV-2026-8802',
    vehicleDetails: 'TS-09-EQ-4421 / VRL Logistics',
    driverName: '',
    driverContact: '',
    documentName: '',
  })

  const dispatchedQty = useMemo(
    () => history.reduce((sum, record) => sum + record.dispatchedQty, 0),
    [history],
  )
  const pendingDispatchQty = ORDER_TOTAL_QTY - dispatchedQty
  const activeInvoices = useMemo(() => {
    const invoices = new Set(history.map((record) => record.invoiceNumber))
    return invoices.size
  }, [history])

  function showToast(message: string) {
    setToast(message)
    window.setTimeout(() => setToast(null), 2400)
  }

  function openDispatchDrawer(batch: PendingBatch) {
    setForm({
      batchId: batch.id,
      dispatchedQty: String(batch.readyQty),
      dispatchDateTime: '2026-09-05T10:00',
      invoiceNumber: `INV-2026-${8801 + history.length}`,
      vehicleDetails: 'TS-09-EQ-4421 / VRL Logistics',
      driverName: '',
      driverContact: '',
      documentName: '',
    })
    setDrawerOpen(true)
  }

  function toggleExpanded(id: string) {
    setExpandedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    )
  }

  function handleMockUpload() {
    setForm((prev) => ({
      ...prev,
      documentName: `BOL-${prev.invoiceNumber.replace('INV-', '')}.pdf`,
    }))
    showToast('Bill of Lading / transporter document attached.')
  }

  function handleRecordDispatch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const batch = pendingBatches.find((item) => item.id === form.batchId)
    if (!batch) {
      showToast('Select a valid batch.')
      return
    }

    const qty = Number(form.dispatchedQty)
    if (!Number.isFinite(qty) || qty <= 0) {
      showToast('Dispatched quantity must be greater than zero.')
      return
    }
    if (qty > batch.readyQty) {
      showToast(`Cannot dispatch more than ready qty (${batch.readyQty}).`)
      return
    }
    if (!form.dispatchDateTime || !form.invoiceNumber.trim()) {
      showToast('Dispatch date/time and invoice number are required.')
      return
    }
    if (!form.vehicleDetails.trim() || !form.driverName.trim()) {
      showToast('Transport and driver details are required.')
      return
    }
    if (!form.documentName.trim()) {
      showToast('Attach Bill of Lading / transporter document.')
      return
    }

    const [vehicle, transporter] = form.vehicleDetails
      .split('/')
      .map((part) => part.trim())

    const record: DispatchRecord = {
      id: `disp-${crypto.randomUUID().slice(0, 8)}`,
      batchTag: batch.tag,
      dispatchedQty: qty,
      dispatchDateTime: form.dispatchDateTime,
      invoiceNumber: form.invoiceNumber.trim(),
      vehicle: vehicle || form.vehicleDetails.trim(),
      transporter: transporter || 'Assigned Carrier',
      driverName: form.driverName.trim(),
      driverContact: form.driverContact.trim() || '—',
      documentName: form.documentName,
      trackingStatus: 'Departed plant gate — tracking live',
      status: 'Dispatched & In-Transit',
      lineItems: [
        {
          partCode: 'TB-HP-001',
          description: 'HP Stage-1 Rotor Blade',
          qty,
        },
      ],
    }

    setHistory((current) => [record, ...current])
    setExpandedIds((current) => [record.id, ...current])

    if (qty >= batch.readyQty) {
      setPendingBatches((current) =>
        current.filter((item) => item.id !== batch.id),
      )
    } else {
      setPendingBatches((current) =>
        current.map((item) =>
          item.id === batch.id
            ? { ...item, readyQty: item.readyQty - qty }
            : item,
        ),
      )
    }

    setDrawerOpen(false)
    showToast(`${batch.tag} dispatch recorded — ${qty} pcs.`)
  }

  const selectedBatch = pendingBatches.find((item) => item.id === form.batchId)

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-border bg-surface-raised px-5 py-4 shadow-sm shadow-black/5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-industrial">
              Module 05 · Outbound Control
            </p>
            <h2 className="mt-1 text-lg font-semibold text-foreground">
              Dispatch Console
            </h2>
            <p className="mt-1 text-sm text-muted">
              Authorize packed lots for PO-2026-0041 and capture invoice /
              transport evidence.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1.5 text-xs font-semibold text-accent ring-1 ring-accent/30">
            <Truck className="h-3.5 w-3.5" />
            Live Dispatch Desk
          </span>
        </div>
      </section>

      {/* Summary KPIs */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-border bg-surface-raised p-4 shadow-sm shadow-black/5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
            Total Order Qty
          </p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
            {ORDER_TOTAL_QTY}
          </p>
          <p className="mt-1 text-sm text-muted">pcs on PO-2026-0041</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface-raised p-4 shadow-sm shadow-black/5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
            Dispatched Qty
          </p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-success">
            {dispatchedQty}
          </p>
          <p className="mt-1 text-sm text-muted">confirmed outbound</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface-raised p-4 shadow-sm shadow-black/5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
            Pending Dispatch
          </p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-warning">
            {pendingDispatchQty}
          </p>
          <p className="mt-1 text-sm text-muted">remaining on order</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface-raised p-4 shadow-sm shadow-black/5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
              Active Invoices
            </p>
            <Receipt className="h-4 w-4 text-accent" />
          </div>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
            {activeInvoices}
          </p>
          <p className="mt-1 text-sm text-muted">linked to dispatches</p>
        </div>
      </section>

      {/* Pending Batches */}
      <section className="overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-sm shadow-black/5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h3 className="text-base font-semibold text-foreground">
              Pending Batches for Dispatch
            </h3>
            <p className="text-sm text-muted">
              Quality-released lots ready for transport booking
            </p>
          </div>
          <span className="rounded-full bg-surface-muted px-2.5 py-1 text-xs font-semibold text-muted ring-1 ring-border">
            {pendingBatches.length} ready
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-muted/50 text-[11px] uppercase tracking-[0.12em] text-muted">
                <th className="px-5 py-3 font-semibold">Batch</th>
                <th className="px-4 py-3 font-semibold">Ready Qty</th>
                <th className="px-4 py-3 font-semibold">Packed Date</th>
                <th className="px-4 py-3 font-semibold">Location</th>
                <th className="px-4 py-3 font-semibold">QA</th>
                <th className="px-5 py-3 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {pendingBatches.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-8 text-center text-sm text-muted"
                  >
                    No pending batches. All ready lots have been dispatched.
                  </td>
                </tr>
              ) : (
                pendingBatches.map((batch) => (
                  <tr
                    key={batch.id}
                    className="border-b border-border/70 transition hover:bg-surface-muted/40"
                  >
                    <td className="px-5 py-3.5 font-semibold text-foreground">
                      {batch.tag}
                    </td>
                    <td className="px-4 py-3.5 tabular-nums">
                      {batch.readyQty}{' '}
                      <span className="text-muted">pcs ready</span>
                    </td>
                    <td className="px-4 py-3.5 tabular-nums text-muted">
                      {batch.packedDate}
                    </td>
                    <td className="px-4 py-3.5 text-muted">{batch.location}</td>
                    <td className="px-4 py-3.5">
                      <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-success ring-1 ring-emerald-500/30">
                        {batch.qualityStatus}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => openDispatchDrawer(batch)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-3 py-2 text-xs font-semibold text-white transition hover:brightness-110 dark:text-slate-950"
                      >
                        <Send className="h-3.5 w-3.5" />
                        Record Dispatch
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Dispatched History */}
      <section className="overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-sm shadow-black/5">
        <div className="border-b border-border px-5 py-4">
          <h3 className="text-base font-semibold text-foreground">
            Dispatched History
          </h3>
          <p className="text-sm text-muted">
            Expand rows for line items, invoice tags, and vehicle tracking
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-muted/50 text-[11px] uppercase tracking-[0.12em] text-muted">
                <th className="w-10 px-3 py-3" />
                <th className="px-3 py-3 font-semibold">Batch</th>
                <th className="px-3 py-3 font-semibold">Qty</th>
                <th className="px-3 py-3 font-semibold">Dispatch Date</th>
                <th className="px-3 py-3 font-semibold">Invoice</th>
                <th className="px-3 py-3 font-semibold">Vehicle</th>
                <th className="px-5 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {history.map((record) => {
                const expanded = expandedIds.includes(record.id)
                return (
                  <Fragment key={record.id}>
                    <tr className="border-b border-border/70 transition hover:bg-surface-muted/35">
                      <td className="px-3 py-3">
                        <button
                          type="button"
                          onClick={() => toggleExpanded(record.id)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface-muted text-muted transition hover:text-foreground"
                          aria-label={expanded ? 'Collapse row' : 'Expand row'}
                        >
                          {expanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </button>
                      </td>
                      <td className="px-3 py-3 font-semibold text-foreground">
                        {record.batchTag}
                      </td>
                      <td className="px-3 py-3 tabular-nums">
                        {record.dispatchedQty} pcs
                      </td>
                      <td className="px-3 py-3 tabular-nums text-muted">
                        {formatDisplayDateTime(record.dispatchDateTime)}
                      </td>
                      <td className="px-3 py-3">
                        <span className="rounded-md bg-accent/15 px-2 py-0.5 font-mono text-xs font-semibold text-accent ring-1 ring-accent/25">
                          {record.invoiceNumber}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-muted">{record.vehicle}</td>
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/15 px-2.5 py-1 text-xs font-semibold text-accent ring-1 ring-sky-500/30">
                          <PackageCheck className="h-3 w-3" />
                          {record.status}
                        </span>
                      </td>
                    </tr>
                    {expanded ? (
                      <tr className="border-b border-border bg-surface-muted/30">
                        <td colSpan={7} className="px-5 py-4">
                          <div className="grid gap-4 lg:grid-cols-3">
                            <div className="rounded-xl border border-border bg-surface-raised p-3">
                              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                                Line Items
                              </p>
                              <ul className="mt-2 space-y-1.5">
                                {record.lineItems.map((line) => (
                                  <li
                                    key={`${record.id}-${line.partCode}`}
                                    className="flex items-center justify-between gap-2 text-sm"
                                  >
                                    <span>
                                      <span className="font-mono font-semibold text-foreground">
                                        {line.partCode}
                                      </span>
                                      <span className="text-muted">
                                        {' '}
                                        · {line.description}
                                      </span>
                                    </span>
                                    <span className="font-semibold tabular-nums">
                                      {line.qty}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            <div className="rounded-xl border border-border bg-surface-raised p-3">
                              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                                Invoice & Documents
                              </p>
                              <p className="mt-2 font-mono text-sm font-semibold text-accent">
                                {record.invoiceNumber}
                              </p>
                              <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-muted">
                                <Paperclip className="h-3.5 w-3.5" />
                                {record.documentName}
                              </p>
                            </div>

                            <div className="rounded-xl border border-border bg-surface-raised p-3">
                              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                                Vehicle Tracking
                              </p>
                              <p className="mt-2 text-sm font-semibold text-foreground">
                                {record.vehicle} · {record.transporter}
                              </p>
                              <p className="mt-1 text-sm text-muted">
                                Driver: {record.driverName} ({record.driverContact})
                              </p>
                              <p className="mt-2 text-xs font-medium text-accent">
                                {record.trackingStatus}
                              </p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Record Dispatch Drawer */}
      {drawerOpen && selectedBatch ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-4 sm:items-center">
          <div
            className="absolute inset-0"
            onClick={() => setDrawerOpen(false)}
            aria-hidden
          />
          <div className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-border bg-surface-raised p-5 shadow-2xl shadow-black/30">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-industrial">
                  Record Dispatch Details
                </p>
                <h3 className="mt-1 text-lg font-semibold text-foreground">
                  {selectedBatch.tag} · {selectedBatch.readyQty} pcs ready
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface-muted text-muted transition hover:text-foreground"
                aria-label="Close dispatch drawer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleRecordDispatch} className="space-y-3">
              <label className="block space-y-1.5">
                <span className="text-xs font-medium uppercase tracking-wider text-muted">
                  Dispatched Qty
                </span>
                <input
                  type="number"
                  min={1}
                  max={selectedBatch.readyQty}
                  value={form.dispatchedQty}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      dispatchedQty: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-border bg-surface-muted px-3 py-2.5 text-sm outline-none ring-accent/30 focus:ring-2"
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs font-medium uppercase tracking-wider text-muted">
                  Dispatch Date & Time
                </span>
                <input
                  type="datetime-local"
                  value={form.dispatchDateTime}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      dispatchDateTime: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-border bg-surface-muted px-3 py-2.5 text-sm outline-none ring-accent/30 focus:ring-2"
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs font-medium uppercase tracking-wider text-muted">
                  Invoice Number
                </span>
                <input
                  value={form.invoiceNumber}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      invoiceNumber: event.target.value,
                    }))
                  }
                  placeholder="INV-2026-8801"
                  className="w-full rounded-xl border border-border bg-surface-muted px-3 py-2.5 font-mono text-sm outline-none ring-accent/30 focus:ring-2"
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs font-medium uppercase tracking-wider text-muted">
                  Transport / Vehicle Details
                </span>
                <input
                  value={form.vehicleDetails}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      vehicleDetails: event.target.value,
                    }))
                  }
                  placeholder="TS-09-EQ-4421 / VRL Logistics"
                  className="w-full rounded-xl border border-border bg-surface-muted px-3 py-2.5 text-sm outline-none ring-accent/30 focus:ring-2"
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-1.5">
                  <span className="text-xs font-medium uppercase tracking-wider text-muted">
                    Driver Name
                  </span>
                  <input
                    value={form.driverName}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        driverName: event.target.value,
                      }))
                    }
                    placeholder="M. Reddy"
                    className="w-full rounded-xl border border-border bg-surface-muted px-3 py-2.5 text-sm outline-none ring-accent/30 focus:ring-2"
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-xs font-medium uppercase tracking-wider text-muted">
                    Driver Contact
                  </span>
                  <input
                    value={form.driverContact}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        driverContact: event.target.value,
                      }))
                    }
                    placeholder="+91 98765 44120"
                    className="w-full rounded-xl border border-border bg-surface-muted px-3 py-2.5 text-sm outline-none ring-accent/30 focus:ring-2"
                  />
                </label>
              </div>

              <div className="rounded-xl border border-dashed border-border bg-surface-muted/60 p-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-muted">
                      Bill of Lading / Transporter Document
                    </p>
                    <p className="mt-1 text-sm text-foreground">
                      {form.documentName || 'No document attached'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleMockUpload}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface-raised px-3 py-2 text-xs font-semibold text-foreground transition hover:border-accent/40 hover:text-accent"
                  >
                    <FileUp className="h-3.5 w-3.5" />
                    Attach Document
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="rounded-xl border border-border bg-surface-muted px-3.5 py-2 text-sm font-medium text-muted transition hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-xl bg-accent px-3.5 py-2 text-sm font-semibold text-white transition hover:brightness-110 dark:text-slate-950"
                >
                  <Send className="h-4 w-4" />
                  Confirm Dispatch
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className="fixed bottom-5 right-5 z-[60] max-w-sm rounded-xl border border-border bg-surface-raised px-4 py-3 text-sm font-medium text-foreground shadow-lg shadow-black/20">
          {toast}
        </div>
      ) : null}
    </div>
  )
}
