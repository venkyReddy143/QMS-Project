import {
  AlertTriangle,
  Gauge,
  Package,
  Percent,
  TrendingUp,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const STEP_COMPLETION = [
  { step: 'Casting', planned: 500, completed: 310 },
  { step: 'CNC', planned: 500, completed: 225 },
  { step: 'Coating', planned: 500, completed: 180 },
  { step: 'NDT', planned: 500, completed: 140 },
  { step: 'Packing', planned: 500, completed: 100 },
]

const OPERATOR_EFFICIENCY = [
  {
    day: 'Aug 15',
    'R. Kumar Planned': 7.5,
    'R. Kumar Actual': 7.2,
    'S. Patel Planned': 7.5,
    'S. Patel Actual': 7.8,
    'A. Khan Planned': 7.0,
    'A. Khan Actual': 6.9,
  },
  {
    day: 'Aug 16',
    'R. Kumar Planned': 7.5,
    'R. Kumar Actual': 7.6,
    'S. Patel Planned': 7.5,
    'S. Patel Actual': 7.4,
    'A. Khan Planned': 7.0,
    'A. Khan Actual': 7.1,
  },
  {
    day: 'Aug 17',
    'R. Kumar Planned': 7.5,
    'R. Kumar Actual': 7.9,
    'S. Patel Planned': 7.5,
    'S. Patel Actual': 8.1,
    'A. Khan Planned': 7.0,
    'A. Khan Actual': 6.8,
  },
  {
    day: 'Aug 18',
    'R. Kumar Planned': 7.5,
    'R. Kumar Actual': 7.3,
    'S. Patel Planned': 7.5,
    'S. Patel Actual': 7.7,
    'A. Khan Planned': 7.0,
    'A. Khan Actual': 7.2,
  },
  {
    day: 'Aug 19',
    'R. Kumar Planned': 7.5,
    'R. Kumar Actual': 7.8,
    'S. Patel Planned': 7.5,
    'S. Patel Actual': 7.5,
    'A. Khan Planned': 7.0,
    'A. Khan Actual': 7.4,
  },
  {
    day: 'Aug 20',
    'R. Kumar Planned': 7.5,
    'R. Kumar Actual': 7.1,
    'S. Patel Planned': 7.5,
    'S. Patel Actual': 7.9,
    'A. Khan Planned': 7.0,
    'A. Khan Actual': 6.7,
  },
  {
    day: 'Aug 21',
    'R. Kumar Planned': 7.5,
    'R. Kumar Actual': 7.4,
    'S. Patel Planned': 7.5,
    'S. Patel Actual': 7.6,
    'A. Khan Planned': 7.0,
    'A. Khan Actual': 7.0,
  },
]

const REJECTION_PARETO = [
  { name: 'Casting Porosity', value: 45, color: '#0891b2' },
  { name: 'Tool Wear', value: 30, color: '#f59e0b' },
  { name: 'Surface Scratch', value: 25, color: '#f87171' },
]

const BOTTLENECKS = [
  {
    id: 'bn-1',
    step: 'CNC Machining',
    machine: 'CNC-01 / CNC-02',
    downtimeHours: 6.0,
    queuePieces: 48,
    deliveryImpact: 'Batch 2 dispatch at risk (−1.5 days buffer)',
    severity: 'Critical',
  },
  {
    id: 'bn-2',
    step: 'Coating',
    machine: 'COAT-01',
    downtimeHours: 3.2,
    queuePieces: 22,
    deliveryImpact: 'Downstream NDT window slips +0.5 day',
    severity: 'Elevated',
  },
  {
    id: 'bn-3',
    step: 'NDT Testing',
    machine: 'NDT Cell',
    downtimeHours: 1.0,
    queuePieces: 14,
    deliveryImpact: 'Contained — recoverable in Shift C',
    severity: 'Watch',
  },
]

const tooltipStyle = {
  background: 'var(--color-surface-raised)',
  border: '1px solid var(--color-border)',
  borderRadius: 12,
  color: 'var(--color-foreground)',
  fontSize: 12,
}

function severityTone(severity: string): string {
  switch (severity) {
    case 'Critical':
      return 'bg-rose-500/15 text-danger ring-1 ring-rose-500/30'
    case 'Elevated':
      return 'bg-amber-500/15 text-warning ring-1 ring-amber-500/30'
    default:
      return 'bg-sky-500/15 text-accent ring-1 ring-sky-500/30'
  }
}

export function ProductionAnalyticsDashboard() {
  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-border bg-surface-raised px-5 py-4 shadow-sm shadow-black/5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-industrial">
              Module 06 · Executive Analytics
            </p>
            <h2 className="mt-1 text-lg font-semibold text-foreground">
              Production Progress & Efficiency Dashboard
            </h2>
            <p className="mt-1 text-sm text-muted">
              PO-2026-0041 · HP Stage-1 Rotor Blade · live operational snapshot
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1.5 text-xs font-semibold text-accent ring-1 ring-accent/30">
            <TrendingUp className="h-3.5 w-3.5" />
            As of 21 Aug 2026 · Shift A
          </span>
        </div>
      </section>

      {/* Executive KPI Cards */}
      <section className="grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-border bg-surface-raised p-4 shadow-sm shadow-black/5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
              Overall Order Progress
            </p>
            <Package className="h-4 w-4 text-accent" />
          </div>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
            45%
          </p>
          <p className="mt-1 text-sm text-muted">Completed · 225 / 500 pcs</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-muted ring-1 ring-border/50">
            <div className="h-full w-[45%] rounded-full bg-accent" />
          </div>
        </article>

        <article className="rounded-2xl border border-border bg-surface-raised p-4 shadow-sm shadow-black/5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
              Step Bottleneck Indicator
            </p>
            <AlertTriangle className="h-4 w-4 text-warning" />
          </div>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
            CNC Machining
          </p>
          <p className="mt-1 text-sm text-muted">
            Highest queue / cycle delay across route
          </p>
          <span className="mt-3 inline-flex rounded-full bg-amber-500/15 px-2.5 py-1 text-[11px] font-semibold text-warning ring-1 ring-amber-500/30">
            48 pcs queued · 6.0h downtime impact
          </span>
        </article>

        <article className="rounded-2xl border border-border bg-surface-raised p-4 shadow-sm shadow-black/5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
              Overall Plant Efficiency
            </p>
            <Gauge className="h-4 w-4 text-success" />
          </div>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-success">
            101.4%
          </p>
          <p className="mt-1 text-sm text-muted">
            Planned vs actual hours (plant-wide)
          </p>
        </article>

        <article className="rounded-2xl border border-border bg-surface-raised p-4 shadow-sm shadow-black/5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
              First-Pass Yield / Scrap
            </p>
            <Percent className="h-4 w-4 text-industrial" />
          </div>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
            98.2%
          </p>
          <p className="mt-1 text-sm text-muted">Rejections: 9 pcs</p>
        </article>
      </section>

      {/* Chart Grid */}
      <section className="grid gap-4 xl:grid-cols-2">
        {/* Chart 1: Step Completion Breakdown */}
        <article className="rounded-2xl border border-border bg-surface-raised p-5 shadow-sm shadow-black/5 xl:col-span-2">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-foreground">
              Step Completion Breakdown
            </h3>
            <p className="text-sm text-muted">
              Planned qty vs completed qty across primary process steps
            </p>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={STEP_COMPLETION} barGap={6}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--color-border)"
                />
                <XAxis
                  dataKey="step"
                  tick={{ fill: 'var(--color-muted)', fontSize: 12 }}
                />
                <YAxis tick={{ fill: 'var(--color-muted)', fontSize: 12 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Bar
                  dataKey="planned"
                  name="Planned Qty"
                  fill="var(--color-border)"
                  radius={[8, 8, 0, 0]}
                />
                <Bar
                  dataKey="completed"
                  name="Completed Qty"
                  fill="var(--color-accent)"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        {/* Chart 2: Operator Efficiency Trends */}
        <article className="rounded-2xl border border-border bg-surface-raised p-5 shadow-sm shadow-black/5">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-foreground">
              Operator Efficiency Trends
            </h3>
            <p className="text-sm text-muted">
              Planned vs actual hours · last 7 days (R. Kumar, S. Patel, A. Khan)
            </p>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={OPERATOR_EFFICIENCY}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--color-border)"
                />
                <XAxis
                  dataKey="day"
                  tick={{ fill: 'var(--color-muted)', fontSize: 11 }}
                />
                <YAxis
                  domain={[6, 8.5]}
                  tick={{ fill: 'var(--color-muted)', fontSize: 12 }}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line
                  type="monotone"
                  dataKey="R. Kumar Planned"
                  stroke="#94a3b8"
                  strokeDasharray="4 4"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="R. Kumar Actual"
                  stroke="#0891b2"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="S. Patel Planned"
                  stroke="#94a3b8"
                  strokeDasharray="4 4"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="S. Patel Actual"
                  stroke="#f59e0b"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="A. Khan Actual"
                  stroke="#34d399"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>

        {/* Chart 3: Rejection Reason Pareto */}
        <article className="rounded-2xl border border-border bg-surface-raised p-5 shadow-sm shadow-black/5">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-foreground">
              Rejection Reason Pareto
            </h3>
            <p className="text-sm text-muted">
              Defect contribution mix for current order scrap events
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-[1fr_180px] md:items-center">
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={REJECTION_PARETO}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={58}
                    outerRadius={92}
                    paddingAngle={3}
                    stroke="var(--color-surface-raised)"
                    strokeWidth={2}
                  >
                    {REJECTION_PARETO.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value) => [`${value}%`, 'Share']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="space-y-2.5">
              {REJECTION_PARETO.map((item) => (
                <li
                  key={item.name}
                  className="rounded-xl border border-border bg-surface-muted/50 px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ background: item.color }}
                    />
                    <span className="text-sm font-medium text-foreground">
                      {item.name}
                    </span>
                  </div>
                  <p className="mt-1 pl-4 text-xs font-semibold tabular-nums text-muted">
                    {item.value}% of rejections
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </article>
      </section>

      {/* Bottleneck & Downtime Table */}
      <section className="overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-sm shadow-black/5">
        <div className="border-b border-border px-5 py-4">
          <h3 className="text-base font-semibold text-foreground">
            Active Bottleneck & Downtime
          </h3>
          <p className="text-sm text-muted">
            Affected steps, downtime hours, and estimated delivery adherence
            impact
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-muted/50 text-[11px] uppercase tracking-[0.12em] text-muted">
                <th className="px-5 py-3 font-semibold">Affected Step</th>
                <th className="px-4 py-3 font-semibold">Machine / Cell</th>
                <th className="px-4 py-3 font-semibold">Downtime (hrs)</th>
                <th className="px-4 py-3 font-semibold">Queue</th>
                <th className="px-4 py-3 font-semibold">Delivery Impact</th>
                <th className="px-5 py-3 font-semibold">Severity</th>
              </tr>
            </thead>
            <tbody>
              {BOTTLENECKS.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-border/70 transition hover:bg-surface-muted/40"
                >
                  <td className="px-5 py-3.5 font-semibold text-foreground">
                    {row.step}
                  </td>
                  <td className="px-4 py-3.5 text-muted">{row.machine}</td>
                  <td className="px-4 py-3.5 font-semibold tabular-nums">
                    {row.downtimeHours.toFixed(1)}
                  </td>
                  <td className="px-4 py-3.5 tabular-nums text-muted">
                    {row.queuePieces} pcs
                  </td>
                  <td className="max-w-xs px-4 py-3.5 text-muted">
                    {row.deliveryImpact}
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${severityTone(row.severity)}`}
                    >
                      {row.severity}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
