import { useMemo, useState, type FormEvent } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  Clock3,
  PauseCircle,
  ScanLine,
  Search,
  UserRound,
  XCircle,
} from 'lucide-react'
import { getStepByCode, pieceSerials } from '../data/mockData'

type CaptureTab = 'serial' | 'bulk'
type SerialStatus = 'Completed' | 'In-Progress' | 'Rejected' | 'On-Hold'
type RejectionReason =
  | ''
  | 'Surface Defect'
  | 'Dimensional Out-of-Tolerance'
  | 'Casting Porosity'

interface LogEntry {
  id: string
  serial: string
  status: SerialStatus
  actualHours: number
  step: string
  time: string
  rejectionReason?: string
}

interface BulkRow {
  stepName: string
  qtyCompleted: string
  qtyInProgress: string
  qtyRejected: string
  totalActualHours: string
  remarks: string
}

const OPERATOR = {
  name: 'R. Kumar',
  shift: 'Shift A',
  window: '06:00 - 14:00',
  station: 'CNC Vertical Mill (CNC-01)',
}

const PRODUCT_CODE = 'TB-HP-001'
const CURRENT_STEP = 'CNC Machining'
const STANDARD_HOURS = 2.5

const INITIAL_LOGS: LogEntry[] = [
  {
    id: 'log-1',
    serial: 'TB-HP-001-0038',
    status: 'Completed',
    actualHours: 2.4,
    step: 'CNC Machining',
    time: '10:42',
  },
  {
    id: 'log-2',
    serial: 'TB-HP-001-0039',
    status: 'In-Progress',
    actualHours: 1.1,
    step: 'CNC Machining',
    time: '11:05',
  },
  {
    id: 'log-3',
    serial: 'TB-HP-001-0040',
    status: 'Rejected',
    actualHours: 2.6,
    step: 'CNC Machining',
    time: '11:28',
    rejectionReason: 'Surface Defect',
  },
  {
    id: 'log-4',
    serial: 'TB-HP-001-0041',
    status: 'On-Hold',
    actualHours: 0.5,
    step: 'CNC Machining',
    time: '11:51',
  },
  {
    id: 'log-5',
    serial: 'TB-HP-001-0037',
    status: 'Completed',
    actualHours: 2.55,
    step: 'CNC Machining',
    time: '12:08',
  },
]

const INITIAL_BULK: BulkRow[] = [
  {
    stepName: 'Casting',
    qtyCompleted: '12',
    qtyInProgress: '4',
    qtyRejected: '1',
    totalActualHours: '7.2',
    remarks: '',
  },
  {
    stepName: 'CNC Machining',
    qtyCompleted: '8',
    qtyInProgress: '3',
    qtyRejected: '1',
    totalActualHours: '22.4',
    remarks: 'Tool change at 10:15',
  },
  {
    stepName: 'Coating',
    qtyCompleted: '5',
    qtyInProgress: '2',
    qtyRejected: '0',
    totalActualHours: '5.6',
    remarks: '',
  },
  {
    stepName: 'NDT Testing',
    qtyCompleted: '4',
    qtyInProgress: '1',
    qtyRejected: '0',
    totalActualHours: '1.4',
    remarks: '',
  },
  {
    stepName: 'Final Inspection',
    qtyCompleted: '3',
    qtyInProgress: '0',
    qtyRejected: '0',
    totalActualHours: '0.7',
    remarks: '',
  },
  {
    stepName: 'Packing',
    qtyCompleted: '2',
    qtyInProgress: '0',
    qtyRejected: '0',
    totalActualHours: '0.4',
    remarks: '',
  },
]

function statusIcon(status: SerialStatus) {
  switch (status) {
    case 'Completed':
      return CheckCircle2
    case 'In-Progress':
      return Clock3
    case 'Rejected':
      return XCircle
    case 'On-Hold':
      return PauseCircle
  }
}

function statusTone(status: SerialStatus): string {
  switch (status) {
    case 'Completed':
      return 'bg-emerald-500/15 text-success ring-1 ring-emerald-500/30'
    case 'In-Progress':
      return 'bg-sky-500/15 text-accent ring-1 ring-sky-500/30'
    case 'Rejected':
      return 'bg-rose-500/15 text-danger ring-1 ring-rose-500/30'
    case 'On-Hold':
      return 'bg-amber-500/15 text-warning ring-1 ring-amber-500/30'
  }
}

function nowTimeLabel(): string {
  return new Date().toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function ShopFloorCapture() {
  const [tab, setTab] = useState<CaptureTab>('serial')
  const [scanInput, setScanInput] = useState('TB-HP-001-0042')
  const [activeSerial, setActiveSerial] = useState('TB-HP-001-0042')
  const [status, setStatus] = useState<SerialStatus>('In-Progress')
  const [actualHours, setActualHours] = useState('2.7')
  const [rejectionReason, setRejectionReason] = useState<RejectionReason>('')
  const [logs, setLogs] = useState<LogEntry[]>(INITIAL_LOGS)
  const [bulkRows, setBulkRows] = useState<BulkRow[]>(INITIAL_BULK)
  const [toast, setToast] = useState<string | null>(null)

  const cncStep = getStepByCode('CNC')
  const standardHours = cncStep?.standardHours ?? STANDARD_HOURS

  const matchedSerial = useMemo(() => {
    return pieceSerials.find(
      (serial) =>
        serial.serialNumber.toLowerCase() === activeSerial.toLowerCase(),
    )
  }, [activeSerial])

  function showToast(message: string) {
    setToast(message)
    window.setTimeout(() => setToast(null), 2400)
  }

  function handleScanSearch(event?: FormEvent) {
    event?.preventDefault()
    const value = scanInput.trim().toUpperCase()
    if (!value) {
      showToast('Enter or scan a piece serial.')
      return
    }
    setActiveSerial(value)
    setStatus('In-Progress')
    setActualHours(String(standardHours))
    setRejectionReason('')
    showToast(`Serial ${value} loaded.`)
  }

  function handleConfirmSerial() {
    const hours = Number(actualHours)
    if (!activeSerial.trim()) {
      showToast('No active serial selected.')
      return
    }
    if (!Number.isFinite(hours) || hours < 0) {
      showToast('Enter a valid actual hours value.')
      return
    }
    if (status === 'Rejected' && !rejectionReason) {
      showToast('Select a rejection reason.')
      return
    }

    const entry: LogEntry = {
      id: `log-${crypto.randomUUID().slice(0, 8)}`,
      serial: activeSerial.trim().toUpperCase(),
      status,
      actualHours: hours,
      step: CURRENT_STEP,
      time: nowTimeLabel(),
      rejectionReason: status === 'Rejected' ? rejectionReason : undefined,
    }

    setLogs((current) => [entry, ...current].slice(0, 5))
    showToast(`${entry.serial} updated to ${status}.`)
  }

  function updateBulkRow(
    index: number,
    field: keyof BulkRow,
    value: string,
  ) {
    setBulkRows((current) =>
      current.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [field]: value } : row,
      ),
    )
  }

  function handleSaveBulk() {
    showToast('End-of-shift bulk progress saved.')
  }

  return (
    <div className="space-y-4">
      {/* Operator Header Bar */}
      <section className="rounded-2xl border border-border bg-surface-raised px-4 py-3 shadow-sm shadow-black/5 sm:px-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-accent/15 text-accent ring-1 ring-accent/30">
              <UserRound className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-industrial">
                Shop Floor Capture
              </p>
              <p className="text-base font-semibold text-foreground sm:text-lg">
                Operator: {OPERATOR.name}
              </p>
            </div>
          </div>

          <div className="grid gap-2 text-sm sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-center lg:gap-3">
            <div className="rounded-xl border border-border bg-surface-muted px-3 py-2">
              <span className="text-muted">Shift: </span>
              <span className="font-semibold text-foreground">
                {OPERATOR.shift}
              </span>
              <span className="text-muted"> ({OPERATOR.window})</span>
            </div>
            <div className="rounded-xl border border-border bg-surface-muted px-3 py-2">
              <span className="text-muted">Station: </span>
              <span className="font-semibold text-foreground">
                {OPERATOR.station}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Dual Mode Switcher */}
      <div className="inline-flex w-full rounded-2xl border border-border bg-surface-raised p-1.5 shadow-sm shadow-black/5 sm:w-auto">
        <button
          type="button"
          onClick={() => setTab('serial')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition sm:flex-none sm:px-5 ${
            tab === 'serial'
              ? 'bg-accent text-white dark:text-slate-950'
              : 'text-muted hover:text-foreground'
          }`}
        >
          <ScanLine className="h-4 w-4" />
          Piece-Level Serial Scan
        </button>
        <button
          type="button"
          onClick={() => setTab('bulk')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition sm:flex-none sm:px-5 ${
            tab === 'bulk'
              ? 'bg-accent text-white dark:text-slate-950'
              : 'text-muted hover:text-foreground'
          }`}
        >
          <ClipboardList className="h-4 w-4" />
          End-of-Shift Bulk Progress
        </button>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-4">
          {tab === 'serial' ? (
            <>
              {/* Serial Scan */}
              <section className="rounded-2xl border border-border bg-surface-raised p-4 shadow-sm shadow-black/5 sm:p-5">
                <form
                  onSubmit={handleScanSearch}
                  className="flex flex-col gap-3 sm:flex-row"
                >
                  <label className="relative block flex-1">
                    <span className="sr-only">Scan or enter piece serial</span>
                    <ScanLine className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
                    <input
                      value={scanInput}
                      onChange={(event) => setScanInput(event.target.value)}
                      placeholder="Scan or enter piece serial e.g., TB-HP-001-0042"
                      className="w-full rounded-xl border border-border bg-surface-muted py-3.5 pl-11 pr-3 text-base font-medium text-foreground outline-none ring-accent/30 transition focus:ring-2"
                    />
                  </label>
                  <button
                    type="submit"
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-foreground px-5 text-sm font-semibold text-surface transition hover:opacity-90"
                  >
                    <Search className="h-4 w-4" />
                    Load Serial
                  </button>
                </form>
              </section>

              {/* Active Serial Detail */}
              <section className="rounded-2xl border border-border bg-surface-raised p-4 shadow-sm shadow-black/5 sm:p-5">
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-industrial">
                      Active Serial Detail
                    </p>
                    <h2 className="mt-1 font-mono text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                      {activeSerial}
                    </h2>
                    {matchedSerial ? (
                      <p className="mt-1 text-sm text-muted">
                        Found in mock ledger · Batch{' '}
                        {matchedSerial.batchId.replace('batch-', '')}
                      </p>
                    ) : (
                      <p className="mt-1 text-sm text-warning">
                        Serial not in seeded range — capture will still log.
                      </p>
                    )}
                  </div>
                  <span className="rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold text-accent ring-1 ring-accent/30">
                    Station CNC-01
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-border bg-surface-muted p-3">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted">
                      Serial ID
                    </p>
                    <p className="mt-1 font-mono text-sm font-semibold text-foreground">
                      {activeSerial}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border bg-surface-muted p-3">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted">
                      Product Code
                    </p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {PRODUCT_CODE}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border bg-surface-muted p-3">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted">
                      Current Step
                    </p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {CURRENT_STEP}
                    </p>
                    <p className="text-xs text-muted">
                      Std {standardHours.toFixed(2)}h
                    </p>
                  </div>
                </div>

                {/* Quick Log Controls */}
                <div className="mt-5 space-y-4 rounded-2xl border border-border bg-surface-muted/50 p-4">
                  <p className="text-sm font-semibold text-foreground">
                    Quick Log Controls
                  </p>

                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="block space-y-1.5">
                      <span className="text-xs font-medium uppercase tracking-wider text-muted">
                        Status
                      </span>
                      <select
                        value={status}
                        onChange={(event) => {
                          const next = event.target.value as SerialStatus
                          setStatus(next)
                          if (next !== 'Rejected') setRejectionReason('')
                        }}
                        className="min-h-12 w-full rounded-xl border border-border bg-surface-raised px-3 text-base text-foreground outline-none ring-accent/30 focus:ring-2"
                      >
                        <option value="Completed">Completed</option>
                        <option value="In-Progress">In-Progress</option>
                        <option value="Rejected">Rejected</option>
                        <option value="On-Hold">On-Hold</option>
                      </select>
                    </label>

                    <label className="block space-y-1.5">
                      <span className="text-xs font-medium uppercase tracking-wider text-muted">
                        Actual Hours
                      </span>
                      <div className="relative">
                        <input
                          type="number"
                          min={0}
                          step={0.1}
                          value={actualHours}
                          onChange={(event) => setActualHours(event.target.value)}
                          className="min-h-12 w-full rounded-xl border border-border bg-surface-raised px-3 pr-28 text-base text-foreground outline-none ring-accent/30 focus:ring-2"
                        />
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">
                          vs {standardHours.toFixed(1)}h std
                        </span>
                      </div>
                    </label>
                  </div>

                  {status === 'Rejected' ? (
                    <label className="block space-y-1.5">
                      <span className="text-xs font-medium uppercase tracking-wider text-muted">
                        Rejection Reason
                      </span>
                      <select
                        value={rejectionReason}
                        onChange={(event) =>
                          setRejectionReason(
                            event.target.value as RejectionReason,
                          )
                        }
                        className="min-h-12 w-full rounded-xl border border-border bg-surface-raised px-3 text-base text-foreground outline-none ring-accent/30 focus:ring-2"
                      >
                        <option value="">Select reason…</option>
                        <option value="Surface Defect">Surface Defect</option>
                        <option value="Dimensional Out-of-Tolerance">
                          Dimensional Out-of-Tolerance
                        </option>
                        <option value="Casting Porosity">Casting Porosity</option>
                      </select>
                    </label>
                  ) : null}

                  {Number(actualHours) > standardHours ? (
                    <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-sm text-warning">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      Actual hours exceed standard by{' '}
                      {(Number(actualHours) - standardHours).toFixed(1)}h —
                      variance will be flagged for supervisor review.
                    </div>
                  ) : null}

                  <button
                    type="button"
                    onClick={handleConfirmSerial}
                    className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 text-base font-semibold text-white transition hover:brightness-110 dark:text-slate-950"
                  >
                    <CheckCircle2 className="h-5 w-5" />
                    Confirm & Update Serial Status
                  </button>
                </div>
              </section>
            </>
          ) : (
            /* Bulk Progress Tab */
            <section className="overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-sm shadow-black/5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-4 sm:px-5">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    End-of-Shift Bulk Progress
                  </h2>
                  <p className="text-sm text-muted">
                    Capture step totals for {OPERATOR.shift} before handover
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSaveBulk}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl bg-accent px-4 text-sm font-semibold text-white transition hover:brightness-110 dark:text-slate-950"
                >
                  Save Bulk Progress
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-[860px] w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border bg-surface-muted/50 text-[11px] uppercase tracking-[0.12em] text-muted">
                      <th className="px-4 py-3 font-semibold sm:px-5">
                        Step Name
                      </th>
                      <th className="px-3 py-3 font-semibold">Qty Completed</th>
                      <th className="px-3 py-3 font-semibold">Qty In-Progress</th>
                      <th className="px-3 py-3 font-semibold">Qty Rejected</th>
                      <th className="px-3 py-3 font-semibold">
                        Total Actual Hours
                      </th>
                      <th className="px-4 py-3 font-semibold sm:px-5">
                        Remarks
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {bulkRows.map((row, index) => (
                      <tr
                        key={row.stepName}
                        className="border-b border-border/70"
                      >
                        <td className="px-4 py-3 font-semibold text-foreground sm:px-5">
                          {row.stepName}
                        </td>
                        {(
                          [
                            'qtyCompleted',
                            'qtyInProgress',
                            'qtyRejected',
                            'totalActualHours',
                          ] as const
                        ).map((field) => (
                          <td key={field} className="px-3 py-2.5">
                            <input
                              type="number"
                              min={0}
                              step={field === 'totalActualHours' ? 0.1 : 1}
                              value={row[field]}
                              onChange={(event) =>
                                updateBulkRow(index, field, event.target.value)
                              }
                              className="min-h-11 w-24 rounded-lg border border-border bg-surface-muted px-2 text-sm outline-none ring-accent/30 focus:ring-2"
                            />
                          </td>
                        ))}
                        <td className="px-4 py-2.5 sm:px-5">
                          <input
                            value={row.remarks}
                            onChange={(event) =>
                              updateBulkRow(index, 'remarks', event.target.value)
                            }
                            placeholder="Optional note"
                            className="min-h-11 w-full min-w-[160px] rounded-lg border border-border bg-surface-muted px-2 text-sm outline-none ring-accent/30 focus:ring-2"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>

        {/* Live Log Feed */}
        <aside className="rounded-2xl border border-border bg-surface-raised p-4 shadow-sm shadow-black/5 xl:sticky xl:top-24 xl:self-start">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-industrial">
                Live Log Feed
              </p>
              <h3 className="text-base font-semibold text-foreground">
                Last 5 piece updates
              </h3>
            </div>
            <span className="rounded-full bg-surface-muted px-2 py-1 text-[11px] font-semibold text-muted ring-1 ring-border">
              {OPERATOR.shift}
            </span>
          </div>

          <ul className="space-y-2.5">
            {logs.map((entry) => {
              const Icon = statusIcon(entry.status)
              return (
                <li
                  key={entry.id}
                  className="rounded-xl border border-border bg-surface-muted/60 p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-mono text-sm font-semibold text-foreground">
                        {entry.serial}
                      </p>
                      <p className="mt-0.5 text-xs text-muted">{entry.step}</p>
                    </div>
                    <span className="text-xs tabular-nums text-muted">
                      {entry.time}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusTone(entry.status)}`}
                    >
                      <Icon className="h-3 w-3" />
                      {entry.status}
                    </span>
                    <span className="text-xs text-muted">
                      {entry.actualHours.toFixed(1)}h actual
                    </span>
                  </div>
                  {entry.rejectionReason ? (
                    <p className="mt-1.5 text-xs text-danger">
                      Reason: {entry.rejectionReason}
                    </p>
                  ) : null}
                </li>
              )
            })}
          </ul>
        </aside>
      </div>

      {toast ? (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm rounded-xl border border-border bg-surface-raised px-4 py-3 text-sm font-medium text-foreground shadow-lg shadow-black/20">
          {toast}
        </div>
      ) : null}
    </div>
  )
}
