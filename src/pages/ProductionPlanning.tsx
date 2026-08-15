const PLAN_ROWS = [
  {
    step: 'Casting',
    machine: 'FURN-01',
    shift: 'A',
    plannedQty: 40,
    hours: 18,
  },
  {
    step: 'CNC Machining',
    machine: 'CNC-01',
    shift: 'A',
    plannedQty: 12,
    hours: 30,
  },
  {
    step: 'CNC Machining',
    machine: 'CNC-02',
    shift: 'B',
    plannedQty: 10,
    hours: 25,
  },
  {
    step: 'Coating',
    machine: 'COAT-01',
    shift: 'B',
    plannedQty: 20,
    hours: 16,
  },
]

export function ProductionPlanning() {
  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-border bg-surface-raised p-5">
        <h2 className="text-2xl font-bold text-foreground">Production Planning</h2>
        <p className="mt-1 text-base text-muted">
          Plan today’s machine load by process step and shift.
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-surface-raised p-4">
          <p className="text-sm font-semibold text-muted">Selected Order</p>
          <p className="mt-1 text-xl font-bold text-accent">PO-2026-0041</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface-raised p-4">
          <p className="text-sm font-semibold text-muted">Plan Date</p>
          <p className="mt-1 text-xl font-bold text-foreground">15 Aug 2026</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface-raised p-4">
          <p className="text-sm font-semibold text-muted">Total Planned Hours</p>
          <p className="mt-1 text-xl font-bold text-foreground">89 hrs</p>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-border bg-surface-raised">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
          <h3 className="text-lg font-bold">Shift Allocation Plan</h3>
          <button
            type="button"
            className="min-h-11 rounded-xl bg-accent px-5 text-sm font-bold text-white hover:brightness-110"
          >
            Save Plan
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-base">
            <thead className="bg-surface-muted text-sm font-bold uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Process Step</th>
                <th className="px-4 py-3">Machine</th>
                <th className="px-4 py-3">Shift</th>
                <th className="px-4 py-3">Planned Qty</th>
                <th className="px-4 py-3">Hours</th>
              </tr>
            </thead>
            <tbody>
              {PLAN_ROWS.map((row) => (
                <tr
                  key={`${row.step}-${row.machine}-${row.shift}`}
                  className="border-t border-border"
                >
                  <td className="px-4 py-3 font-semibold">{row.step}</td>
                  <td className="px-4 py-3">{row.machine}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-accent-soft px-3 py-1 text-sm font-bold text-accent">
                      Shift {row.shift}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold">{row.plannedQty} pcs</td>
                  <td className="px-4 py-3">{row.hours} hrs</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
