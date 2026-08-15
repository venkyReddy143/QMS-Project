import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  getEmployeeName,
  serialStatusClass,
  useOrders,
  type ShiftCode,
} from '../context/OrdersContext'

interface DraftEntry {
  serialId: string
  selected: boolean
  progressPercent: string
  note: string
  mode: 'complete' | 'partial'
}

export function ProductionPlanning() {
  const {
    orders,
    employees,
    machines,
    submitShiftProgress,
    raiseDispute,
    serialFormatExample,
  } = useOrders()

  const workableOrders = orders.filter((order) => order.batches.length > 0)
  const [orderId, setOrderId] = useState(workableOrders[0]?.id ?? orders[0]?.id ?? '')
  const selectedOrder = orders.find((order) => order.id === orderId) ?? workableOrders[0]

  const [batchId, setBatchId] = useState(selectedOrder?.batches[0]?.id ?? '')
  const [employeeId, setEmployeeId] = useState(employees[0]?.id ?? '')
  const [shift, setShift] = useState<ShiftCode>('B')
  const [machineId, setMachineId] = useState(machines[0]?.id ?? '')
  const [message, setMessage] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, DraftEntry>>({})
  const [disputeSerialId, setDisputeSerialId] = useState('')
  const [disputePercent, setDisputePercent] = useState('20')
  const [disputeNote, setDisputeNote] = useState('')

  const selectedBatch =
    selectedOrder?.batches.find((batch) => batch.id === batchId) ??
    selectedOrder?.batches[0]

  const openSerials = useMemo(() => {
    if (!selectedBatch) return []
    return selectedBatch.serials.filter((serial) =>
      ['Queued', 'In Progress', 'Disputed'].includes(serial.status),
    )
  }, [selectedBatch])

  function onSelectOrder(nextId: string) {
    setOrderId(nextId)
    const order = orders.find((item) => item.id === nextId)
    setBatchId(order?.batches[0]?.id ?? '')
    setDrafts({})
    setMessage(null)
  }

  function onSelectBatch(nextId: string) {
    setBatchId(nextId)
    setDrafts({})
    setMessage(null)
  }

  function ensureDraft(serialId: string, currentPercent: number): DraftEntry {
    return (
      drafts[serialId] ?? {
        serialId,
        selected: false,
        progressPercent: String(currentPercent || 40),
        note: '',
        mode: 'complete',
      }
    )
  }

  function toggleSerial(serialId: string, currentPercent: number) {
    setDrafts((current) => {
      const existing = ensureDraft(serialId, currentPercent)
      return {
        ...current,
        [serialId]: { ...existing, selected: !existing.selected },
      }
    })
  }

  function updateDraft(
    serialId: string,
    currentPercent: number,
    patch: Partial<DraftEntry>,
  ) {
    setDrafts((current) => {
      const existing = ensureDraft(serialId, currentPercent)
      return {
        ...current,
        [serialId]: { ...existing, ...patch, selected: true },
      }
    })
  }

  function handleSubmitShift() {
    if (!selectedOrder || !selectedBatch) return
    const entries = Object.values(drafts)
      .filter((draft) => draft.selected)
      .map((draft) => ({
        serialId: draft.serialId,
        progressPercent:
          draft.mode === 'complete' ? 100 : Number(draft.progressPercent) || 0,
        note: draft.note,
      }))

    const result = submitShiftProgress({
      orderId: selectedOrder.id,
      batchId: selectedBatch.id,
      employeeId,
      shift,
      machineId,
      entries,
    })
    setMessage(result.message)
    if (result.ok) setDrafts({})
  }

  function handleRaiseDispute() {
    if (!selectedOrder || !selectedBatch || !disputeSerialId) {
      setMessage('Select an in-progress serial to dispute.')
      return
    }
    const result = raiseDispute({
      orderId: selectedOrder.id,
      batchId: selectedBatch.id,
      serialId: disputeSerialId,
      challengerEmployeeId: employeeId,
      challengerShift: shift,
      challengerPercent: Number(disputePercent) || 0,
      challengerNote: disputeNote,
    })
    setMessage(result.message)
    if (result.ok) {
      setDisputeNote('')
      setDisputeSerialId('')
    }
  }

  if (!selectedOrder) {
    return (
      <div className="rounded-2xl border border-border bg-surface-raised p-5">
        <h2 className="text-2xl font-bold">Shift Work Update</h2>
        <p className="mt-2 text-muted">No orders available.</p>
      </div>
    )
  }

  const inProgressForDispute =
    selectedBatch?.serials.filter((serial) => serial.status === 'In Progress') ??
    []

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-border bg-surface-raised p-5">
        <h2 className="text-2xl font-bold">Shift Work Update</h2>
        <p className="mt-1 text-base text-muted">
          A batch is shared across many employees and shifts. Each person updates
          what they finished today (e.g. 3 completed, 1 at 40%). Next shift can
          dispute in-progress % — Floor Manager final decision.
        </p>
        <p className="mt-2 text-xs font-semibold text-accent">
          Serial format example: {serialFormatExample}
        </p>
      </section>

      {selectedOrder.batches.length === 0 ? (
        <div className="rounded-xl border border-warning/30 bg-amber-50 px-4 py-3 text-sm font-semibold text-warning">
          Create batches first on{' '}
          <Link className="underline" to={`/orders/${selectedOrder.id}`}>
            Order Detail
          </Link>
          .
        </div>
      ) : null}

      {message ? (
        <div className="rounded-xl border border-accent/30 bg-accent-soft px-4 py-3 text-sm font-semibold text-accent">
          {message}
        </div>
      ) : null}

      <section className="grid gap-3 rounded-2xl border border-border bg-surface-raised p-5 md:grid-cols-2 xl:grid-cols-5">
        <label className="block space-y-1.5">
          <span className="text-sm font-bold">Order</span>
          <select
            value={selectedOrder.id}
            onChange={(event) => onSelectOrder(event.target.value)}
            className="min-h-12 w-full rounded-xl border border-border bg-surface-muted px-3"
          >
            {orders.map((order) => (
              <option key={order.id} value={order.id}>
                {order.id}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-bold">Batch</span>
          <select
            value={selectedBatch?.id ?? ''}
            onChange={(event) => onSelectBatch(event.target.value)}
            className="min-h-12 w-full rounded-xl border border-border bg-surface-muted px-3"
          >
            {selectedOrder.batches.map((batch) => (
              <option key={batch.id} value={batch.id}>
                {batch.tag} ({batch.quantity} pcs)
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-bold">Employee (this shift)</span>
          <select
            value={employeeId}
            onChange={(event) => setEmployeeId(event.target.value)}
            className="min-h-12 w-full rounded-xl border border-border bg-surface-muted px-3"
          >
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-bold">Shift</span>
          <select
            value={shift}
            onChange={(event) => setShift(event.target.value as ShiftCode)}
            className="min-h-12 w-full rounded-xl border border-border bg-surface-muted px-3"
          >
            <option value="A">Shift A</option>
            <option value="B">Shift B</option>
            <option value="C">Shift C</option>
          </select>
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-bold">Machine used</span>
          <select
            value={machineId}
            onChange={(event) => setMachineId(event.target.value)}
            className="min-h-12 w-full rounded-xl border border-border bg-surface-muted px-3"
          >
            {machines.map((machine) => (
              <option key={machine.id} value={machine.id}>
                {machine.code}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="rounded-2xl border border-border bg-surface-raised p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-lg font-bold">Update serial progress</h3>
            <p className="text-sm text-muted">
              Select pieces worked this shift. Mark complete, or set partial % for
              unfinished pieces.
            </p>
          </div>
          <button
            type="button"
            onClick={handleSubmitShift}
            className="min-h-11 rounded-xl bg-accent px-5 text-sm font-bold text-white"
          >
            Submit Shift Update
          </button>
        </div>

        <div className="mt-4 space-y-2">
          {openSerials.length === 0 ? (
            <p className="rounded-xl bg-surface-muted px-4 py-3 text-sm text-muted">
              No open serials in this batch.
            </p>
          ) : (
            openSerials.slice(0, 25).map((serial) => {
              const draft = ensureDraft(serial.id, serial.progressPercent)
              const locked = serial.status === 'Disputed'
              return (
                <div
                  key={serial.id}
                  className="rounded-xl border border-border bg-surface-muted/50 p-3"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="inline-flex items-center gap-2 text-sm font-bold">
                      <input
                        type="checkbox"
                        checked={draft.selected}
                        disabled={locked}
                        onChange={() =>
                          toggleSerial(serial.id, serial.progressPercent)
                        }
                        className="h-5 w-5 accent-teal-700"
                      />
                      <span className="font-mono text-xs">{serial.serialNumber}</span>
                    </label>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-bold ${serialStatusClass(serial.status)}`}
                    >
                      {serial.status}
                      {serial.status === 'In Progress'
                        ? ` ${serial.progressPercent}%`
                        : ''}
                    </span>
                    <span className="text-xs text-muted">
                      Last: {getEmployeeName(employees, serial.lastEmployeeId)}
                      {serial.lastShift ? ` / Shift ${serial.lastShift}` : ''}
                    </span>
                  </div>

                  {draft.selected && !locked ? (
                    <div className="mt-3 grid gap-2 md:grid-cols-3">
                      <select
                        value={draft.mode}
                        onChange={(event) =>
                          updateDraft(serial.id, serial.progressPercent, {
                            mode: event.target.value as 'complete' | 'partial',
                          })
                        }
                        className="min-h-11 rounded-xl border border-border bg-surface-raised px-3 text-sm"
                      >
                        <option value="complete">Completed this shift</option>
                        <option value="partial">Still in progress (%)</option>
                      </select>
                      {draft.mode === 'partial' ? (
                        <input
                          type="number"
                          min={1}
                          max={99}
                          value={draft.progressPercent}
                          onChange={(event) =>
                            updateDraft(serial.id, serial.progressPercent, {
                              progressPercent: event.target.value,
                            })
                          }
                          className="min-h-11 rounded-xl border border-border bg-surface-raised px-3 text-sm"
                          placeholder="e.g. 40"
                        />
                      ) : (
                        <div className="flex min-h-11 items-center rounded-xl border border-border bg-surface-raised px-3 text-sm font-semibold text-success">
                          Will mark 100% complete
                        </div>
                      )}
                      <input
                        value={draft.note}
                        onChange={(event) =>
                          updateDraft(serial.id, serial.progressPercent, {
                            note: event.target.value,
                          })
                        }
                        placeholder="Optional note"
                        className="min-h-11 rounded-xl border border-border bg-surface-raised px-3 text-sm"
                      />
                    </div>
                  ) : null}

                  {locked ? (
                    <p className="mt-2 text-sm font-semibold text-warning">
                      Locked for Floor Manager review (dispute open).
                    </p>
                  ) : null}
                </div>
              )
            })
          )}
          {openSerials.length > 25 ? (
            <p className="text-xs text-muted">
              Showing first 25 open serials for easy shop-floor use.
            </p>
          ) : null}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface-raised p-5">
        <h3 className="text-lg font-bold">Next shift dispute (handover challenge)</h3>
        <p className="mt-1 text-sm text-muted">
          Example: previous shift said 40% done. Next shift checks and says only
          20%. Raise dispute → Floor Manager decides final %.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-sm font-bold">In-progress serial</span>
            <select
              value={disputeSerialId}
              onChange={(event) => setDisputeSerialId(event.target.value)}
              className="min-h-12 w-full rounded-xl border border-border bg-surface-muted px-3"
            >
              <option value="">Select serial</option>
              {inProgressForDispute.map((serial) => (
                <option key={serial.id} value={serial.id}>
                  {serial.serialNumber} · reported {serial.progressPercent}% by{' '}
                  {getEmployeeName(employees, serial.lastEmployeeId)}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-bold">Your suggested %</span>
            <input
              type="number"
              min={0}
              max={99}
              value={disputePercent}
              onChange={(event) => setDisputePercent(event.target.value)}
              className="min-h-12 w-full rounded-xl border border-border bg-surface-muted px-3"
            />
          </label>
        </div>
        <label className="mt-3 block space-y-1.5">
          <span className="text-sm font-bold">Reason</span>
          <textarea
            value={disputeNote}
            onChange={(event) => setDisputeNote(event.target.value)}
            rows={3}
            placeholder="Why do you disagree with previous progress?"
            className="w-full rounded-xl border border-border bg-surface-muted px-3 py-2"
          />
        </label>
        <button
          type="button"
          onClick={handleRaiseDispute}
          className="mt-3 min-h-11 rounded-xl border border-warning bg-amber-50 px-5 text-sm font-bold text-warning"
        >
          Raise Dispute for Floor Manager
        </button>
      </section>
    </div>
  )
}
