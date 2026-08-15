import { useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock3,
  MessageSquareWarning,
  ShieldCheck,
  UserRound,
  Wrench,
} from 'lucide-react'

type HandoverStatus = 'PENDING ACKNOWLEDGMENT' | 'ACKNOWLEDGED'

interface OpenSerial {
  id: string
  serial: string
  step: string
  progress: number
  note: string
}

const OPEN_SERIALS: OpenSerial[] = [
  {
    id: 'os-1',
    serial: 'TB-HP-001-0045',
    step: 'CNC Machining',
    progress: 40,
    note: 'Roughing complete · finish pass pending',
  },
  {
    id: 'os-2',
    serial: 'TB-HP-001-0046',
    step: 'CNC Machining',
    progress: 15,
    note: 'Setup verified · first-cut in progress',
  },
  {
    id: 'os-3',
    serial: 'TB-HP-001-0047',
    step: 'CNC Machining',
    progress: 70,
    note: 'Awaiting final dimensional check on cell',
  },
]

export function ShiftHandoverAndDeviations() {
  const [handoverStatus, setHandoverStatus] =
    useState<HandoverStatus>('PENDING ACKNOWLEDGMENT')
  const [handoverNotes, setHandoverNotes] = useState(
    'CNC-01 spindle load was elevated on TB-HP-001-0045 after 11:40. Coolant top-up completed. Fixture clamp #2 retorqued. Incoming shift should verify tool life before resuming finish pass.',
  )
  const [schedulePushed, setSchedulePushed] = useState(false)
  const [managerComment, setManagerComment] = useState('')
  const [varianceApproved, setVarianceApproved] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  function showToast(message: string) {
    setToast(message)
    window.setTimeout(() => setToast(null), 2600)
  }

  function handleAcknowledge() {
    if (!handoverNotes.trim()) {
      showToast('Add handover notes before acknowledgment.')
      return
    }
    setHandoverStatus('ACKNOWLEDGED')
    showToast('Shift takeover acknowledged by S. Patel.')
  }

  function handleSchedulePush() {
    setSchedulePushed(true)
    showToast(
      'Automated schedule push applied: Coating & NDT dates shifted +1 day.',
    )
  }

  function handleApproveVariance() {
    if (!managerComment.trim()) {
      showToast('Manager comment is mandatory to approve this deviation.')
      return
    }
    setVarianceApproved(true)
    showToast('Efficiency variance confirmed and approved.')
  }

  const isPending = handoverStatus === 'PENDING ACKNOWLEDGMENT'

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-border bg-surface-raised px-5 py-4 shadow-sm shadow-black/5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-industrial">
              Module 04 · Continuity Control
            </p>
            <h2 className="mt-1 text-lg font-semibold text-foreground">
              Shift Handover & Deviation Log
            </h2>
            <p className="mt-1 text-sm text-muted">
              Formal transfer of open work and confirmation of shop-floor
              disruptions for CNC-01 / CNC-02.
            </p>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
              isPending
                ? 'bg-amber-500/15 text-warning ring-1 ring-amber-500/35'
                : 'bg-emerald-500/15 text-success ring-1 ring-emerald-500/35'
            }`}
          >
            {isPending ? (
              <Clock3 className="h-3.5 w-3.5" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5" />
            )}
            {handoverStatus}
          </span>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        {/* Column 1: Formal Shift Handover Console */}
        <section className="rounded-2xl border border-border bg-surface-raised shadow-sm shadow-black/5">
          <div className="border-b border-border px-5 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
              Column 1
            </p>
            <h3 className="mt-1 text-base font-semibold text-foreground">
              Formal Shift Handover Console
            </h3>
          </div>

          <div className="space-y-4 p-5">
            <div className="rounded-2xl border border-border bg-surface-muted/60 p-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex min-w-[140px] flex-1 items-center gap-2.5">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 text-accent ring-1 ring-accent/25">
                    <UserRound className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-muted">
                      Outgoing
                    </p>
                    <p className="font-semibold text-foreground">R. Kumar</p>
                    <p className="text-xs text-muted">Shift A · 06:00–14:00</p>
                  </div>
                </div>

                <ArrowRight className="hidden h-4 w-4 text-muted sm:block" />

                <div className="flex min-w-[140px] flex-1 items-center gap-2.5">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-industrial/15 text-industrial ring-1 ring-industrial/30">
                    <UserRound className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-muted">
                      Incoming
                    </p>
                    <p className="font-semibold text-foreground">S. Patel</p>
                    <p className="text-xs text-muted">Shift B · 14:00–22:00</p>
                  </div>
                </div>
              </div>

              <div className="mt-3 inline-flex items-center gap-2 rounded-xl border border-border bg-surface-raised px-3 py-2 text-sm">
                <Wrench className="h-3.5 w-3.5 text-muted" />
                <span className="text-muted">Machine:</span>
                <span className="font-semibold text-foreground">CNC-01</span>
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <h4 className="text-sm font-semibold text-foreground">
                  Open / In-Progress Serials Transferred
                </h4>
                <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-semibold text-muted ring-1 ring-border">
                  {OPEN_SERIALS.length} pieces
                </span>
              </div>

              <ul className="space-y-2.5">
                {OPEN_SERIALS.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-xl border border-border bg-surface-muted/50 p-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-mono text-sm font-semibold text-foreground">
                          {item.serial}
                        </p>
                        <p className="mt-0.5 text-xs text-muted">
                          {item.step} · {item.note}
                        </p>
                      </div>
                      <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-[11px] font-semibold text-accent ring-1 ring-sky-500/30">
                        {item.progress}% complete
                      </span>
                    </div>
                    <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-surface ring-1 ring-border/50">
                      <div
                        className="h-full rounded-full bg-accent"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium uppercase tracking-wider text-muted">
                Handover Notes
              </span>
              <textarea
                value={handoverNotes}
                onChange={(event) => setHandoverNotes(event.target.value)}
                rows={4}
                disabled={!isPending}
                className="w-full rounded-xl border border-border bg-surface-muted px-3 py-2.5 text-sm leading-relaxed text-foreground outline-none ring-accent/30 transition focus:ring-2 disabled:opacity-70"
              />
            </label>

            <button
              type="button"
              onClick={handleAcknowledge}
              disabled={!isPending}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-55 dark:text-slate-950"
            >
              <ShieldCheck className="h-4 w-4" />
              {isPending
                ? 'Acknowledge & Takeover Shift'
                : 'Shift Acknowledged by S. Patel'}
            </button>
          </div>
        </section>

        {/* Column 2: Breakdown Events & Variance Confirmation */}
        <section className="rounded-2xl border border-border bg-surface-raised shadow-sm shadow-black/5">
          <div className="border-b border-border px-5 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
              Column 2
            </p>
            <h3 className="mt-1 text-base font-semibold text-foreground">
              Breakdown Events & Variance Confirmation
            </h3>
          </div>

          <div className="space-y-4 p-5">
            {/* Incident 1: Machine Breakdown */}
            <article className="rounded-2xl border border-rose-500/25 bg-rose-500/5 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/15 text-danger ring-1 ring-rose-500/30">
                    <AlertTriangle className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-danger">
                      Incident 1 · Machine Breakdown
                    </p>
                    <h4 className="mt-1 text-base font-semibold text-foreground">
                      CNC-02 Breakdown
                    </h4>
                    <p className="mt-1 text-sm text-muted">
                      Logged at <span className="font-medium text-foreground">15:30</span>
                      {' · '}
                      Estimated downtime{' '}
                      <span className="font-medium text-foreground">~6 hrs</span>
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-rose-500/15 px-2.5 py-1 text-[11px] font-semibold text-danger ring-1 ring-rose-500/30">
                  Active
                </span>
              </div>

              <div className="mt-3 rounded-xl border border-border bg-surface-raised/80 px-3 py-2.5 text-sm text-muted">
                Downstream impact expected on Coating and NDT release windows
                unless schedule is rebalanced.
              </div>

              {schedulePushed ? (
                <div className="mt-3 flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-sm text-success">
                  <CalendarClock className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>
                    Schedule push applied. Downstream{' '}
                    <span className="font-semibold">Coating / NDT</span> dates
                    shifted by <span className="font-semibold">+1 day</span>.
                  </p>
                </div>
              ) : null}

              <button
                type="button"
                onClick={handleSchedulePush}
                disabled={schedulePushed}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-surface-raised px-4 py-2.5 text-sm font-semibold text-danger transition hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <CalendarClock className="h-4 w-4" />
                {schedulePushed
                  ? 'Schedule Push Completed'
                  : 'Trigger Automated Schedule Push'}
              </button>
            </article>

            {/* Incident 2: Efficiency Variance */}
            <article className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-warning ring-1 ring-amber-500/30">
                    <MessageSquareWarning className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-warning">
                      Incident 2 · Efficiency Variance Flag
                    </p>
                    <h4 className="mt-1 font-mono text-base font-semibold text-foreground">
                      TB-HP-001-0042
                    </h4>
                    <p className="mt-1 text-sm text-muted">
                      Logged{' '}
                      <span className="font-medium text-foreground">3.2h</span>{' '}
                      actual vs{' '}
                      <span className="font-medium text-foreground">2.5h</span>{' '}
                      standard
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-[11px] font-semibold text-warning ring-1 ring-amber-500/30">
                  28% Variance
                </span>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl border border-border bg-surface-raised px-2 py-2">
                  <p className="text-[10px] uppercase tracking-wider text-muted">
                    Actual
                  </p>
                  <p className="mt-0.5 font-semibold text-foreground">3.2h</p>
                </div>
                <div className="rounded-xl border border-border bg-surface-raised px-2 py-2">
                  <p className="text-[10px] uppercase tracking-wider text-muted">
                    Standard
                  </p>
                  <p className="mt-0.5 font-semibold text-foreground">2.5h</p>
                </div>
                <div className="rounded-xl border border-border bg-surface-raised px-2 py-2">
                  <p className="text-[10px] uppercase tracking-wider text-muted">
                    Delta
                  </p>
                  <p className="mt-0.5 font-semibold text-warning">+0.7h</p>
                </div>
              </div>

              <label className="mt-3 block space-y-1.5">
                <span className="text-xs font-medium uppercase tracking-wider text-muted">
                  Manager Comment <span className="text-danger">(Mandatory)</span>
                </span>
                <textarea
                  value={managerComment}
                  onChange={(event) => setManagerComment(event.target.value)}
                  rows={3}
                  disabled={varianceApproved}
                  placeholder="Explain root cause and corrective action before approval…"
                  className="w-full rounded-xl border border-border bg-surface-raised px-3 py-2.5 text-sm leading-relaxed text-foreground outline-none ring-accent/30 transition focus:ring-2 disabled:opacity-70"
                />
              </label>

              {varianceApproved ? (
                <div className="mt-3 flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-sm text-success">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  Deviation approved. Comment retained for audit trail.
                </div>
              ) : null}

              <button
                type="button"
                onClick={handleApproveVariance}
                disabled={varianceApproved}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-surface transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-55"
              >
                <ShieldCheck className="h-4 w-4" />
                {varianceApproved
                  ? 'Deviation Approved'
                  : 'Confirm & Approve Deviation'}
              </button>
            </article>
          </div>
        </section>
      </div>

      {toast ? (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm rounded-xl border border-border bg-surface-raised px-4 py-3 text-sm font-medium text-foreground shadow-lg shadow-black/20">
          {toast}
        </div>
      ) : null}
    </div>
  )
}
