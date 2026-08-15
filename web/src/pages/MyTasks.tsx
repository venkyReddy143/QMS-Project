import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { getEmployeeName, useOrders } from '../context/OrdersContext'

export function MyTasks() {
  const { user } = useAuth()
  const {
    employees,
    getPendingDisputes,
    resolveDispute,
    findSerial,
    disputes,
  } = useOrders()

  const pending = getPendingDisputes()
  const [message, setMessage] = useState<string | null>(null)
  const [finalPercents, setFinalPercents] = useState<Record<string, string>>({})
  const [notes, setNotes] = useState<Record<string, string>>({})

  function handleResolve(disputeId: string) {
    const result = resolveDispute(
      disputeId,
      Number(finalPercents[disputeId] ?? '0'),
      user?.name ?? 'Floor Manager',
      notes[disputeId] ?? '',
    )
    setMessage(result.message)
  }

  const resolved = disputes.filter((item) => item.status === 'Resolved').slice(0, 5)

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-border bg-surface-raised p-5">
        <h2 className="text-2xl font-bold">Floor Manager Reviews</h2>
        <p className="mt-1 text-base text-muted">
          When next shift disputes in-progress %, your decision is final. Set the
          correct completion % so work can continue.
        </p>
      </section>

      {message ? (
        <div className="rounded-xl border border-accent/30 bg-accent-soft px-4 py-3 text-sm font-semibold text-accent">
          {message}
        </div>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface-raised p-4">
          <p className="text-sm font-semibold text-muted">Pending Disputes</p>
          <p className="mt-1 text-3xl font-bold text-warning">{pending.length}</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface-raised p-4">
          <p className="text-sm font-semibold text-muted">Your role</p>
          <p className="mt-1 text-xl font-bold">Final validator</p>
        </div>
      </section>

      <section className="space-y-3">
        {pending.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface-raised px-4 py-6 text-sm text-muted">
            No progress disputes waiting. When Shift B challenges Shift A %, it
            will appear here.
          </div>
        ) : (
          pending.map((dispute) => {
            const found = findSerial(dispute.orderId, dispute.serialId)
            return (
              <article
                key={dispute.id}
                className="rounded-2xl border border-border bg-surface-raised p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-mono text-sm font-bold text-accent">
                      {found?.serial.serialNumber ?? dispute.serialId}
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      {dispute.orderId} · {found?.batch.tag ?? dispute.batchId}
                    </p>
                  </div>
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-warning">
                    Pending Manager Review
                  </span>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-border bg-surface-muted p-3">
                    <p className="text-xs font-semibold uppercase text-muted">
                      Previous shift claim
                    </p>
                    <p className="mt-1 font-bold">
                      {getEmployeeName(employees, dispute.previousEmployeeId)} ·
                      Shift {dispute.previousShift}
                    </p>
                    <p className="text-2xl font-bold text-sky-700">
                      {dispute.previousPercent}%
                    </p>
                  </div>
                  <div className="rounded-xl border border-border bg-amber-50 p-3">
                    <p className="text-xs font-semibold uppercase text-muted">
                      Next shift challenge
                    </p>
                    <p className="mt-1 font-bold">
                      {getEmployeeName(employees, dispute.challengerEmployeeId)} ·
                      Shift {dispute.challengerShift}
                    </p>
                    <p className="text-2xl font-bold text-warning">
                      {dispute.challengerPercent}%
                    </p>
                    <p className="mt-1 text-sm text-muted">{dispute.challengerNote}</p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-[160px_1fr_auto]">
                  <label className="block space-y-1.5">
                    <span className="text-sm font-bold">Final % (your decision)</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={
                        finalPercents[dispute.id] ??
                        String(dispute.challengerPercent)
                      }
                      onChange={(event) =>
                        setFinalPercents((current) => ({
                          ...current,
                          [dispute.id]: event.target.value,
                        }))
                      }
                      className="min-h-12 w-full rounded-xl border border-border bg-surface-muted px-3"
                    />
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-sm font-bold">Manager note</span>
                    <input
                      value={notes[dispute.id] ?? ''}
                      onChange={(event) =>
                        setNotes((current) => ({
                          ...current,
                          [dispute.id]: event.target.value,
                        }))
                      }
                      placeholder="Why this final %?"
                      className="min-h-12 w-full rounded-xl border border-border bg-surface-muted px-3"
                    />
                  </label>
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => handleResolve(dispute.id)}
                      className="min-h-12 w-full rounded-xl bg-accent px-4 text-sm font-bold text-white"
                    >
                      Confirm Final Decision
                    </button>
                  </div>
                </div>
              </article>
            )
          })
        )}
      </section>

      {resolved.length > 0 ? (
        <section className="rounded-2xl border border-border bg-surface-raised p-5">
          <h3 className="text-lg font-bold">Recent decisions</h3>
          <div className="mt-3 space-y-2">
            {resolved.map((dispute) => (
              <div
                key={dispute.id}
                className="rounded-xl border border-border bg-surface-muted px-3 py-3 text-sm"
              >
                <span className="font-bold">{dispute.orderId}</span> · final{' '}
                <span className="font-bold text-accent">
                  {dispute.managerFinalPercent}%
                </span>{' '}
                by {dispute.resolvedBy}
                {dispute.managerNote ? ` — ${dispute.managerNote}` : ''}
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}
