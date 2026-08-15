import type { ReactNode } from 'react'
import {
  batches,
  getProcessRouteLabel,
  machines,
  pieceSerials,
  processSteps,
  productionOrders,
  shifts,
} from '../data/mockData'

interface ModulePageProps {
  title: string
  eyebrow: string
  children?: ReactNode
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string
  value: string | number
  hint: string
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface-raised p-4 shadow-sm shadow-black/5">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
        {value}
      </p>
      <p className="mt-1 text-sm text-muted">{hint}</p>
    </div>
  )
}

export function ModulePage({ title, eyebrow, children }: ModulePageProps) {
  const order = productionOrders[0]

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-border bg-surface-raised p-5 shadow-sm shadow-black/5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-industrial">
          {eyebrow}
        </p>
        <h2 className="mt-1 text-xl font-semibold text-foreground">{title}</h2>
        <p className="mt-2 max-w-4xl text-sm leading-relaxed text-muted">
          Active order <span className="font-medium text-accent">{order.orderNumber}</span>{' '}
          — {order.partDescription}. Process route:{' '}
          <span className="font-medium text-foreground">{getProcessRouteLabel()}</span>
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Order Qty"
          value={order.quantity}
          hint={`${batches.length} delivery batches`}
        />
        <StatCard
          label="Piece Serials"
          value={pieceSerials.length}
          hint="TB-HP-001-0001 → 0500"
        />
        <StatCard
          label="Process Steps"
          value={processSteps.length}
          hint={`${processSteps.reduce((sum, step) => sum + step.standardHours, 0).toFixed(2)}h / piece`}
        />
        <StatCard
          label="Assets / Shifts"
          value={`${machines.length} / ${shifts.length}`}
          hint="CNC-01, CNC-02, FURN-01 · A/B/C"
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-2xl border border-border bg-surface-raised p-5 xl:col-span-2">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted">
            Delivery Batches
          </h3>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted">
                <tr className="border-b border-border">
                  <th className="px-2 py-2 font-medium">Batch</th>
                  <th className="px-2 py-2 font-medium">Qty</th>
                  <th className="px-2 py-2 font-medium">Status</th>
                  <th className="px-2 py-2 font-medium">Window</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((batch) => (
                  <tr key={batch.id} className="border-b border-border/70">
                    <td className="px-2 py-2.5 font-medium">{batch.batchNumber}</td>
                    <td className="px-2 py-2.5">{batch.quantity}</td>
                    <td className="px-2 py-2.5">
                      <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">
                        {batch.status}
                      </span>
                    </td>
                    <td className="px-2 py-2.5 text-muted">
                      {batch.plannedStart} → {batch.plannedEnd}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface-raised p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted">
            Machines
          </h3>
          <ul className="mt-3 space-y-2">
            {machines.map((machine) => (
              <li
                key={machine.id}
                className="flex items-center justify-between rounded-xl border border-border bg-surface-muted px-3 py-2"
              >
                <div>
                  <p className="font-medium">{machine.code}</p>
                  <p className="text-xs text-muted">{machine.name}</p>
                </div>
                <span className="text-xs font-semibold uppercase tracking-wide text-industrial">
                  {machine.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {children}
    </div>
  )
}
