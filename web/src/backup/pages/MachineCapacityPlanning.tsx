import { useMemo, useState, type FormEvent } from 'react'
import {
  AlertTriangle,
  CalendarRange,
  CheckCircle2,
  Clock3,
  Factory,
  Filter,
  Gauge,
  Plus,
  Wrench,
  X,
  Zap,
} from 'lucide-react'
import { processSteps, shifts } from '../data/mockData'

type AvailabilityStatus = 'Available' | 'Maintenance' | 'Breakdown'
type MachineTypeFilter = 'All' | 'Furnace' | 'CNC' | 'Coating' | 'NDT'

interface CapacityMachine {
  id: string
  code: string
  name: string
  type: Exclude<MachineTypeFilter, 'All'>
  bay: string
  status: AvailabilityStatus
  capacityHours: number
  allocatedHours: number
}

interface AllocationForm {
  machineId: string
  plannedQty: string
  hoursPerPc: string
}

const PROCESS_RULES = [
  { step: 'Casting', hours: 0.45, machineType: 'Furnace' },
  { step: 'CNC Machining', hours: 2.5, machineType: 'CNC' },
  { step: 'Coating', hours: 0.8, machineType: 'Coating' },
  { step: 'NDT', hours: 0.3, machineType: 'NDT' },
] as const

const INITIAL_MACHINES: CapacityMachine[] = [
  {
    id: 'mch-cnc-01',
    code: 'CNC-01',
    name: '5-Axis CNC Cell 01',
    type: 'CNC',
    bay: 'Bay B-12',
    status: 'Available',
    capacityHours: 7.5,
    allocatedHours: 7.5,
  },
  {
    id: 'mch-cnc-02',
    code: 'CNC-02',
    name: '5-Axis CNC Cell 02',
    type: 'CNC',
    bay: 'Bay B-14',
    status: 'Available',
    capacityHours: 7.5,
    allocatedHours: 6.0,
  },
  {
    id: 'mch-furn-01',
    code: 'FURN-01',
    name: 'Investment Casting Furnace 01',
    type: 'Furnace',
    bay: 'Bay A-03',
    status: 'Available',
    capacityHours: 8,
    allocatedHours: 9.5,
  },
  {
    id: 'mch-coat-01',
    code: 'COAT-01',
    name: 'TBC Coating Line 01',
    type: 'Coating',
    bay: 'Bay C-07',
    status: 'Maintenance',
    capacityHours: 7.5,
    allocatedHours: 3.2,
  },
]

function loadTone(loadPct: number): {
  bar: string
  badge: string
  label: string
} {
  if (loadPct > 100) {
    return {
      bar: 'bg-danger',
      badge: 'bg-rose-500/15 text-danger ring-1 ring-rose-500/35',
      label: 'Overloaded',
    }
  }
  if (loadPct >= 85) {
    return {
      bar: 'bg-industrial',
      badge: 'bg-amber-500/15 text-warning ring-1 ring-amber-500/35',
      label: 'Near Limit',
    }
  }
  return {
    bar: 'bg-success',
    badge: 'bg-emerald-500/15 text-success ring-1 ring-emerald-500/35',
    label: 'Healthy',
  }
}

function statusTone(status: AvailabilityStatus): string {
  switch (status) {
    case 'Available':
      return 'bg-emerald-500/15 text-success ring-1 ring-emerald-500/30'
    case 'Maintenance':
      return 'bg-amber-500/15 text-warning ring-1 ring-amber-500/30'
    case 'Breakdown':
      return 'bg-rose-500/15 text-danger ring-1 ring-rose-500/30'
  }
}

export function MachineCapacityPlanning() {
  const [selectedDate, setSelectedDate] = useState('2026-08-21')
  const [selectedShiftId, setSelectedShiftId] = useState(shifts[0].id)
  const [machineType, setMachineType] = useState<MachineTypeFilter>('All')
  const [machines, setMachines] = useState<CapacityMachine[]>(INITIAL_MACHINES)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [form, setForm] = useState<AllocationForm>({
    machineId: INITIAL_MACHINES[0].id,
    plannedQty: '3',
    hoursPerPc: '2.50',
  })

  const selectedShift = shifts.find((shift) => shift.id === selectedShiftId) ?? shifts[0]

  const filteredMachines = useMemo(() => {
    if (machineType === 'All') return machines
    return machines.filter((machine) => machine.type === machineType)
  }, [machineType, machines])

  const kpis = useMemo(() => {
    const plannedHours = machines.reduce((sum, m) => sum + m.allocatedHours, 0)
    const capacityHours = machines.reduce((sum, m) => sum + m.capacityHours, 0)
    const overloaded = machines.filter((m) => m.allocatedHours > m.capacityHours).length
    const utilization = capacityHours === 0 ? 0 : (plannedHours / capacityHours) * 100
    return {
      plannedHours,
      overloaded,
      utilization,
      capacityHours,
    }
  }, [machines])

  function showToast(message: string) {
    setToast(message)
    window.setTimeout(() => setToast(null), 2400)
  }

  function openAllocateDrawer(machineId?: string) {
    const target = machineId ?? filteredMachines[0]?.id ?? machines[0].id
    const machine = machines.find((item) => item.id === target) ?? machines[0]
    const rule = PROCESS_RULES.find((item) => item.machineType === machine.type)
    setForm({
      machineId: machine.id,
      plannedQty: '3',
      hoursPerPc: rule ? rule.hours.toFixed(2) : '1.00',
    })
    setDrawerOpen(true)
  }

  function handleAllocate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const qty = Number(form.plannedQty)
    const hoursPerPc = Number(form.hoursPerPc)

    if (!Number.isFinite(qty) || qty <= 0) {
      showToast('Planned quantity must be greater than zero.')
      return
    }
    if (!Number.isFinite(hoursPerPc) || hoursPerPc <= 0) {
      showToast('Hours per piece must be greater than zero.')
      return
    }

    const addHours = Number((qty * hoursPerPc).toFixed(2))
    setMachines((current) =>
      current.map((machine) =>
        machine.id === form.machineId
          ? {
              ...machine,
              allocatedHours: Number((machine.allocatedHours + addHours).toFixed(2)),
              status:
                machine.status === 'Breakdown' ? machine.status : 'Available',
            }
          : machine,
      ),
    )
    setDrawerOpen(false)
    showToast(`Allocated ${addHours.toFixed(2)}h to selected machine.`)
  }

  return (
    <div className="space-y-5">
      {/* Process-Machine Rule Header */}
      <section className="rounded-2xl border border-border bg-surface-raised p-5 shadow-sm shadow-black/5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-industrial">
              Process–Machine Rules
            </p>
            <h2 className="mt-1 text-lg font-semibold text-foreground">
              Standard hours by process step
            </h2>
            <p className="mt-1 text-sm text-muted">
              Configured route for TB-HP-001 ·{' '}
              {processSteps
                .slice(0, 4)
                .map((step) => step.name)
                .join(' → ')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => openAllocateDrawer()}
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-3.5 py-2 text-sm font-semibold text-white shadow-sm shadow-cyan-900/20 transition hover:brightness-110 dark:text-slate-950"
          >
            <Plus className="h-4 w-4" />
            Allocate Planned Qty to Shift
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {PROCESS_RULES.map((rule) => (
            <div
              key={rule.step}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-muted px-3 py-1.5 text-sm"
            >
              <span className="font-medium text-foreground">{rule.step}</span>
              <span className="text-border">|</span>
              <span className="tabular-nums font-semibold text-accent">
                {rule.hours.toFixed(2)}h/pc
              </span>
              <span className="rounded-md bg-surface px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted ring-1 ring-border">
                {rule.machineType}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* KPI Tiles */}
      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-surface-raised p-4 shadow-sm shadow-black/5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
              Total Plant Planned Hours
            </p>
            <Clock3 className="h-4 w-4 text-accent" />
          </div>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
            {kpis.plannedHours.toFixed(1)}
            <span className="ml-1 text-base font-medium text-muted">hrs</span>
          </p>
          <p className="mt-1 text-sm text-muted">
            vs {kpis.capacityHours.toFixed(1)} hrs effective capacity
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-surface-raised p-4 shadow-sm shadow-black/5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
              Overloaded Machines
            </p>
            <AlertTriangle className="h-4 w-4 text-danger" />
          </div>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
            {kpis.overloaded}
          </p>
          <p className="mt-1 text-sm text-muted">
            Require rebalance before shift release
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-surface-raised p-4 shadow-sm shadow-black/5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
              Shift Utilization
            </p>
            <Gauge className="h-4 w-4 text-industrial" />
          </div>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
            {kpis.utilization.toFixed(0)}
            <span className="ml-1 text-base font-medium text-muted">%</span>
          </p>
          <p className="mt-1 text-sm text-muted">
            {selectedShift.name} · {selectedDate}
          </p>
        </div>
      </section>

      {/* Date & Shift Selector */}
      <section className="rounded-2xl border border-border bg-surface-raised p-4 shadow-sm shadow-black/5">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
          <Filter className="h-4 w-4 text-muted" />
          Date & Shift Selector
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wider text-muted">
              Planning Date
            </span>
            <div className="relative">
              <CalendarRange className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                type="date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                className="w-full rounded-xl border border-border bg-surface-muted py-2.5 pl-10 pr-3 text-sm text-foreground outline-none ring-accent/30 transition focus:ring-2"
              />
            </div>
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wider text-muted">
              Shift
            </span>
            <select
              value={selectedShiftId}
              onChange={(event) => setSelectedShiftId(event.target.value)}
              className="w-full rounded-xl border border-border bg-surface-muted px-3 py-2.5 text-sm text-foreground outline-none ring-accent/30 transition focus:ring-2"
            >
              {shifts.map((shift) => (
                <option key={shift.id} value={shift.id}>
                  {shift.name}: {shift.startTime}–{shift.endTime}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wider text-muted">
              Machine Type
            </span>
            <select
              value={machineType}
              onChange={(event) =>
                setMachineType(event.target.value as MachineTypeFilter)
              }
              className="w-full rounded-xl border border-border bg-surface-muted px-3 py-2.5 text-sm text-foreground outline-none ring-accent/30 transition focus:ring-2"
            >
              <option value="All">All Types</option>
              <option value="Furnace">Furnace</option>
              <option value="CNC">CNC</option>
              <option value="Coating">Coating</option>
              <option value="NDT">NDT</option>
            </select>
          </label>
        </div>
      </section>

      {/* Machine Allocation Cards */}
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Machine Load Heatmap
            </h2>
            <p className="text-sm text-muted">
              {filteredMachines.length} assets · {selectedShift.name} (
              {selectedShift.startTime}–{selectedShift.endTime})
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 font-semibold text-success ring-1 ring-emerald-500/30">
              &lt;85% Healthy
            </span>
            <span className="rounded-full bg-amber-500/15 px-2.5 py-1 font-semibold text-warning ring-1 ring-amber-500/30">
              85–100% Near Limit
            </span>
            <span className="rounded-full bg-rose-500/15 px-2.5 py-1 font-semibold text-danger ring-1 ring-rose-500/30">
              &gt;100% Overload
            </span>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          {filteredMachines.map((machine) => {
            const loadPct = Math.round(
              (machine.allocatedHours / machine.capacityHours) * 100,
            )
            const tone = loadTone(loadPct)
            const overloadHours = Number(
              (machine.allocatedHours - machine.capacityHours).toFixed(1),
            )

            return (
              <article
                key={machine.id}
                className="rounded-2xl border border-border bg-surface-raised p-5 shadow-sm shadow-black/5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 text-accent ring-1 ring-accent/25">
                      <Factory className="h-5 w-5" />
                    </span>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold text-foreground">
                          {machine.code}
                        </h3>
                        <span className="rounded-md bg-surface-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted ring-1 ring-border">
                          {machine.type}
                        </span>
                      </div>
                      <p className="text-sm text-muted">{machine.name}</p>
                      <p className="mt-0.5 text-xs text-muted">{machine.bay}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${statusTone(machine.status)}`}
                    >
                      {machine.status === 'Maintenance' ? (
                        <Wrench className="h-3 w-3" />
                      ) : machine.status === 'Available' ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : (
                        <Zap className="h-3 w-3" />
                      )}
                      {machine.status}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tone.badge}`}
                    >
                      {tone.label}
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-muted">
                      Allocated vs Capacity
                    </p>
                    <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
                      {machine.allocatedHours.toFixed(1)} hrs
                      <span className="mx-1 text-muted">/</span>
                      <span className="text-base font-medium text-muted">
                        {machine.capacityHours.toFixed(1)} hrs max
                      </span>
                    </p>
                  </div>
                  <p className="text-sm font-semibold tabular-nums text-muted">
                    {loadPct}% load
                  </p>
                </div>

                <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-surface-muted ring-1 ring-border/60">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${tone.bar}`}
                    style={{ width: `${Math.min(loadPct, 100)}%` }}
                  />
                </div>

                {overloadHours > 0 ? (
                  <div className="mt-3 flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-sm text-danger">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>
                      <span className="font-semibold">
                        Capacity Overload Warning:
                      </span>{' '}
                      +{overloadHours.toFixed(1)} hrs exceeds shift limit.
                      Rebalance required!
                    </p>
                  </div>
                ) : null}

                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => openAllocateDrawer(machine.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-muted px-3 py-1.5 text-xs font-semibold text-foreground transition hover:border-accent/40 hover:text-accent"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Allocate to Shift
                  </button>
                </div>
              </article>
            )
          })}
        </div>

        {filteredMachines.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface-raised px-5 py-10 text-center text-sm text-muted">
            No machines match the selected type filter.
          </div>
        ) : null}
      </section>

      {/* Allocation Drawer / Modal */}
      {drawerOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-4 sm:items-center">
          <div
            className="absolute inset-0"
            onClick={() => setDrawerOpen(false)}
            aria-hidden
          />
          <div className="relative w-full max-w-lg rounded-2xl border border-border bg-surface-raised p-5 shadow-2xl shadow-black/30">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-industrial">
                  Quick Allocation
                </p>
                <h3 className="mt-1 text-lg font-semibold text-foreground">
                  Allocate Planned Qty to Shift
                </h3>
                <p className="mt-1 text-sm text-muted">
                  {selectedShift.name} · {selectedDate}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface-muted text-muted transition hover:text-foreground"
                aria-label="Close allocation drawer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAllocate} className="space-y-3">
              <label className="block space-y-1.5">
                <span className="text-xs font-medium uppercase tracking-wider text-muted">
                  Machine
                </span>
                <select
                  value={form.machineId}
                  onChange={(event) => {
                    const machine = machines.find(
                      (item) => item.id === event.target.value,
                    )
                    const rule = PROCESS_RULES.find(
                      (item) => item.machineType === machine?.type,
                    )
                    setForm((prev) => ({
                      ...prev,
                      machineId: event.target.value,
                      hoursPerPc: rule
                        ? rule.hours.toFixed(2)
                        : prev.hoursPerPc,
                    }))
                  }}
                  className="w-full rounded-xl border border-border bg-surface-muted px-3 py-2.5 text-sm outline-none ring-accent/30 focus:ring-2"
                >
                  {machines.map((machine) => (
                    <option key={machine.id} value={machine.id}>
                      {machine.code} — {machine.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-1.5">
                  <span className="text-xs font-medium uppercase tracking-wider text-muted">
                    Planned Qty (pcs)
                  </span>
                  <input
                    type="number"
                    min={1}
                    value={form.plannedQty}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        plannedQty: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-border bg-surface-muted px-3 py-2.5 text-sm outline-none ring-accent/30 focus:ring-2"
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-xs font-medium uppercase tracking-wider text-muted">
                    Std Hours / Pc
                  </span>
                  <input
                    type="number"
                    min={0.01}
                    step={0.01}
                    value={form.hoursPerPc}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        hoursPerPc: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-border bg-surface-muted px-3 py-2.5 text-sm outline-none ring-accent/30 focus:ring-2"
                  />
                </label>
              </div>

              <div className="rounded-xl border border-border bg-surface-muted/70 px-3 py-2.5 text-sm text-muted">
                Estimated load add:{' '}
                <span className="font-semibold text-foreground">
                  {(
                    (Number(form.plannedQty) || 0) *
                    (Number(form.hoursPerPc) || 0)
                  ).toFixed(2)}{' '}
                  hrs
                </span>
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
                  className="rounded-xl bg-accent px-3.5 py-2 text-sm font-semibold text-white transition hover:brightness-110 dark:text-slate-950"
                >
                  Confirm Allocation
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className="fixed bottom-5 right-5 z-[60] rounded-xl border border-border bg-surface-raised px-4 py-3 text-sm font-medium text-foreground shadow-lg shadow-black/20">
          {toast}
        </div>
      ) : null}
    </div>
  )
}
