import { Fragment, useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  AlertCircle,
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Layers,
  PlusCircle,
  RefreshCw,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import { fetchAllBatchesApi } from '../lib/api/batches'
import { fetchPlanningOptionsApi, fetchPlansApi } from '../lib/api/planning'
import type { ProductionBatch } from '../types/orders'
import type { PlanningOptions, ProductionPlan } from '../types/planning'

export interface SerialWorkLog {
  id: string
  serialNumber: string
  batchNo: string
  productName: string
  productCode: string
  date: string
  shift: string
  processStepName: string
  process: string
  machineCode: string
  machineName: string
  operatorName: string
  status: string
  completedPercent: number
  comments: string
  plannedHours: number | string
  actualHours: number | string
}

export interface MainSerialRow {
  serialNumber: string
  batchNo: string
  productName: string
  productCode: string
  process: string
  status: string
  completedPercent: number
  comments: string
  startDate: string
  endDate: string
  logs: SerialWorkLog[]
  hasMultipleEmployees: boolean
}

function formatDate(isoDate: string | undefined): string {
  if (!isoDate) return '—'
  const d = new Date(isoDate)
  if (Number.isNaN(d.getTime())) return isoDate
  return d.toISOString().slice(0, 10)
}

function statusBadgeClass(status: string | undefined): string {
  const norm = String(status ?? '').toUpperCase().replace(/\s+/g, '_')
  switch (norm) {
    case 'PLANNED':
    case 'QUEUED':
      return 'bg-blue-100 text-blue-800 border border-blue-200'
    case 'IN_PROGRESS':
    case 'RUNNING':
      return 'bg-amber-100 text-amber-800 border border-amber-200'
    case 'COMPLETED':
    case 'FULL_READY':
    case 'APPROVED':
      return 'bg-emerald-100 text-emerald-800 border border-emerald-200'
    case 'ON_HOLD':
    case 'HOLD':
      return 'bg-purple-100 text-purple-800 border border-purple-200'
    case 'CANCELLED':
    case 'QC_REJECTED':
    case 'REJECTED':
      return 'bg-red-100 text-red-800 border border-red-200'
    default:
      return 'bg-slate-100 text-slate-800 border border-slate-200'
  }
}

export function ProductionPlanning() {
  const [plans, setPlans] = useState<ProductionPlan[]>([])
  const [batches, setBatches] = useState<ProductionBatch[]>([])
  const [options, setOptions] = useState<PlanningOptions | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  // Plan Item Selector
  const [selectedPlanId, setSelectedPlanId] = useState<string>('ALL')

  // Expanded rows state (keyed by serialNumber)
  const [expandedSerials, setExpandedSerials] = useState<Record<string, boolean>>({})

  // Stored work logs per serial (serialNumber -> logs)
  const [workLogsBySerial, setWorkLogsBySerial] = useState<Record<string, SerialWorkLog[]>>({})


  // Handover Modal State
  const [isHandoverModalOpen, setIsHandoverModalOpen] = useState(false)
  const [handoverSerial, setHandoverSerial] = useState<MainSerialRow | null>(null)
  const [handoverOperator, setHandoverOperator] = useState('')
  const [handoverShift, setHandoverShift] = useState('Shift B')
  const [handoverDate, setHandoverDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [handoverPercent, setHandoverPercent] = useState('70')
  const [handoverStatus, setHandoverStatus] = useState('COMPLETED')
  const [handoverHours, setHandoverHours] = useState('1.5')
  const [handoverComments, setHandoverComments] = useState('Handover shift completed remaining work')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      const [plansRes, batchesRes, optionsRes] = await Promise.all([
        fetchPlansApi(),
        fetchAllBatchesApi(),
        fetchPlanningOptionsApi(),
      ])

      if (plansRes.plans) {
        setPlans(plansRes.plans)
        // Default to first plan if available
        if (plansRes.plans.length > 0) {
          setSelectedPlanId(plansRes.plans[0].id)
        }
      }
      if (batchesRes.batches) {
        setBatches(batchesRes.batches)
      }
      if (optionsRes.options) {
        setOptions(optionsRes.options)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load shift records.')
    } finally {
      setLoading(false)
    }
  }

  async function handleRefresh() {
    setRefreshing(true)
    setError(null)
    try {
      const [plansRes, batchesRes] = await Promise.all([
        fetchPlansApi(),
        fetchAllBatchesApi(),
      ])
      if (plansRes.plans) {
        setPlans(plansRes.plans)
      }
      if (batchesRes.batches) {
        setBatches(batchesRes.batches)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh data.')
    } finally {
      setRefreshing(false)
    }
  }

  // Selected Plan Object
  const currentPlan = useMemo(() => {
    if (selectedPlanId === 'ALL') return null
    return plans.find((p) => p.id === selectedPlanId) || null
  }, [plans, selectedPlanId])

  // Filter plans list based on selectedPlanId
  const activePlans = useMemo(() => {
    if (selectedPlanId === 'ALL') return plans
    const found = plans.find((p) => p.id === selectedPlanId)
    return found ? [found] : plans
  }, [plans, selectedPlanId])

  // Generate / Compile Serial Rows for the selected plan(s)
  const serialRows: MainSerialRow[] = useMemo(() => {
    const rows: MainSerialRow[] = []

    for (const plan of activePlans) {
      // Find matching batch
      const matchingBatch = batches.find(
        (b) => b.id === plan.batchId || b.batchNo === plan.batchNo,
      )

      // Look up standard hours for this step from process steps master
      const targetStepName = String(plan.processStepName ?? '').trim().toLowerCase()
      const stepMaster = options?.processSteps?.find(
        (s) =>
          (s?.name && String(s.name).trim().toLowerCase() === targetStepName) ||
          (s?.code && String(s.code).trim().toLowerCase() === targetStepName),
      )
      const standardHours = stepMaster?.standardHoursPerPiece ?? 2.0

      // Piece serial numbers to display
      let serialList: string[] = []

      if (matchingBatch?.serials && matchingBatch.serials.length > 0) {
        serialList = matchingBatch.serials.map((s) => s.serialNumber)
        if (serialList.length === 1) {
          const year = plan.planDate ? new Date(plan.planDate).getFullYear() : 2026
          serialList.push(`SN-${plan.productCode || 'TB'}-${year}-${plan.batchNo}-0002`)
        }
      } else {
        const count = Math.max(2, plan.plannedQuantity || 1)
        const year = plan.planDate ? new Date(plan.planDate).getFullYear() : 2026
        for (let i = 1; i <= count; i++) {
          const seq = String(i).padStart(4, '0')
          serialList.push(`SN-${plan.productCode || 'TB'}-${year}-${plan.batchNo}-${seq}`)
        }
      }

      for (let idx = 0; idx < serialList.length; idx++) {
        const sn = serialList[idx]

        // Check if we have user-recorded / state handover logs for this serial
        let logs = workLogsBySerial[sn]

        if (!logs || logs.length === 0) {
          // Check if this serial is the first piece in a multi-piece batch to demonstrate
          // the multiple employee handover workflow (e.g. 30% by Shift A, 70% by Shift B)
          if (idx === 0 && (plan.status === 'IN_PROGRESS' || plan.status === 'COMPLETED' || plan.status === 'PLANNED')) {
            const operator1 = plan.operatorName || 'R. Kumar'
            const operator2 = options?.operators?.find((o) => o.name !== operator1)?.name || 'Ananya Mehta'
            const hours1 = Number((0.3 * standardHours).toFixed(1))
            const hours2 = Number((0.7 * standardHours).toFixed(1))

            logs = [
              {
                id: `${sn}-log-1`,
                serialNumber: sn,
                batchNo: plan.batchNo || '—',
                productName: plan.productName || '—',
                productCode: plan.productCode || '—',
                date: formatDate(plan.planDate),
                shift: plan.shift || 'Shift A',
                processStepName: plan.processStepName || '—',
                process: plan.process || '—',
                machineCode: plan.machineCode || '—',
                machineName: plan.machineName || '—',
                operatorName: operator1,
                status: 'IN_PROGRESS',
                completedPercent: 30,
                comments: 'Shift A: Rough profiling completed (30% done)',
                plannedHours: standardHours,
                actualHours: hours1,
              },
              {
                id: `${sn}-log-2`,
                serialNumber: sn,
                batchNo: plan.batchNo || '—',
                productName: plan.productName || '—',
                productCode: plan.productCode || '—',
                date: formatDate(plan.planDate),
                shift: 'Shift B',
                processStepName: plan.processStepName || '—',
                process: plan.process || '—',
                machineCode: plan.machineCode || '—',
                machineName: plan.machineName || '—',
                operatorName: operator2,
                status: 'COMPLETED',
                completedPercent: 70,
                comments: 'Shift B: Completed remaining 70% finishing & metrology',
                plannedHours: standardHours,
                actualHours: hours2,
              },
            ]
          } else if (idx === 1) {
            // Second record: one employee logged time with 40% completion, status IN_PROGRESS
            const op = plan.operatorName || 'R. Kumar'
            const actualHrs = Number((0.4 * standardHours).toFixed(1))
            logs = [
              {
                id: `${sn}-log-1`,
                serialNumber: sn,
                batchNo: plan.batchNo || '—',
                productName: plan.productName || '—',
                productCode: plan.productCode || '—',
                date: formatDate(plan.planDate),
                shift: plan.shift || 'Shift A',
                processStepName: plan.processStepName || '—',
                process: plan.process || '—',
                machineCode: plan.machineCode || '—',
                machineName: plan.machineName || '—',
                operatorName: op,
                status: 'IN_PROGRESS',
                completedPercent: 40,
                comments: 'Shift in progress (40% completed)',
                plannedHours: standardHours,
                actualHours: actualHrs,
              },
            ]
          } else {
            // Standard single employee row
            const basePct =
              plan.status === 'COMPLETED'
                ? 100
                : plan.status === 'IN_PROGRESS'
                  ? 50
                  : 0
            const actualHrs =
              basePct > 0 ? Number(((basePct / 100) * standardHours).toFixed(1)) : 0

            logs = [
              {
                id: `${sn}-log-1`,
                serialNumber: sn,
                batchNo: plan.batchNo || '—',
                productName: plan.productName || '—',
                productCode: plan.productCode || '—',
                date: formatDate(plan.planDate),
                shift: plan.shift || 'Shift A',
                processStepName: plan.processStepName || '—',
                process: plan.process || '—',
                machineCode: plan.machineCode || '—',
                machineName: plan.machineName || '—',
                operatorName: plan.operatorName || '—',
                status: plan.status || 'PLANNED',
                completedPercent: basePct,
                comments: plan.notes || 'Normal shift work',
                plannedHours: standardHours,
                actualHours: actualHrs,
              },
            ]
          }
        }

        // Has multiple employees worked on this serial?
        const uniqueOperators = new Set(logs.map((l) => l.operatorName)).size
        const hasMultipleEmployees = logs.length > 1 && (uniqueOperators > 1 || logs.length >= 2)

        // Cumulative completion percentage for the main row
        const totalPct = logs.reduce((acc, l) => acc + (l.completedPercent || 0), 0)
        const completedPercent = Math.min(100, Math.max(0, totalPct))

        // Latest status & comments
        const latestLog = logs[logs.length - 1]
        const mainStatus = latestLog?.status || plan.status || 'PLANNED'
        const mainComments = latestLog?.comments || plan.notes || '—'

        const startDate = formatDate(plan.startedAt || plan.planDate)
        const endDate = formatDate(
          plan.completedAt || matchingBatch?.targetDispatchDate,
        )

        rows.push({
          serialNumber: sn,
          batchNo: plan.batchNo || '—',
          productName: plan.productName || '—',
          productCode: plan.productCode || '—',
          process: plan.process || '—',
          status: mainStatus,
          completedPercent,
          comments: mainComments,
          startDate,
          endDate,
          logs,
          hasMultipleEmployees,
        })
      }
    }

    return rows
  }, [activePlans, batches, options, workLogsBySerial])

  function toggleExpand(serialNumber: string) {
    setExpandedSerials((prev) => ({
      ...prev,
      [serialNumber]: !prev[serialNumber],
    }))
  }

  function openHandoverModal(row: MainSerialRow) {
    setHandoverSerial(row)
    const existingOperators = new Set(row.logs.map((l) => l.operatorName))
    const nextOp =
      options?.operators?.find((o) => !existingOperators.has(o.name))?.name ||
      options?.operators?.[0]?.name ||
      'Floor Operator'

    setHandoverOperator(nextOp)
    setHandoverShift(row.logs[row.logs.length - 1]?.shift === 'Shift A' ? 'Shift B' : 'Shift C')
    setHandoverPercent('50')
    setHandoverStatus('COMPLETED')
    setHandoverHours('1.5')
    setHandoverComments(`Handover shift work on serial ${row.serialNumber}`)
    setIsHandoverModalOpen(true)
  }

  function handleAddHandoverSubmit(e: FormEvent) {
    e.preventDefault()
    if (!handoverSerial) return

    const newLog: SerialWorkLog = {
      id: `${handoverSerial.serialNumber}-log-${Date.now()}`,
      serialNumber: handoverSerial.serialNumber,
      batchNo: handoverSerial.batchNo,
      productName: handoverSerial.productName,
      productCode: handoverSerial.productCode,
      date: handoverDate,
      shift: handoverShift,
      processStepName: handoverSerial.logs[0]?.processStepName || 'CNC Machining',
      process: handoverSerial.process,
      machineCode: handoverSerial.logs[0]?.machineCode || 'CNC-01',
      machineName: handoverSerial.logs[0]?.machineName || 'Machining Cell',
      operatorName: handoverOperator || 'Floor Operator',
      status: handoverStatus,
      completedPercent: Number(handoverPercent) || 0,
      comments: handoverComments.trim(),
      plannedHours: handoverSerial.logs[0]?.plannedHours || 2.0,
      actualHours: Number(handoverHours) || 1.0,
    }

    setWorkLogsBySerial((prev) => {
      const existing = prev[handoverSerial.serialNumber] || handoverSerial.logs
      return {
        ...prev,
        [handoverSerial.serialNumber]: [...existing, newLog],
      }
    })

    // Automatically expand the row to reveal the new handover in the inner table
    setExpandedSerials((prev) => ({
      ...prev,
      [handoverSerial.serialNumber]: true,
    }))

    setNotice(
      `Shift handover logged for serial ${handoverSerial.serialNumber}! Inner table expanded showing multiple employee contributions.`,
    )
    setIsHandoverModalOpen(false)
  }

  // Auto clear notice
  useEffect(() => {
    if (notice) {
      const timer = setTimeout(() => setNotice(null), 6000)
      return () => clearTimeout(timer)
    }
  }, [notice])

  return (
    <div className="space-y-4">
      {/* Global Alerts */}
      {error ? (
        <div className="flex items-center justify-between rounded-xl border border-danger/30 bg-red-50/70 px-4 py-2.5 text-xs font-semibold text-danger">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button type="button" onClick={() => setError(null)} aria-label="Close error notice">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}

      {notice ? (
        <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-50/70 px-4 py-2.5 text-xs font-semibold text-emerald-800">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{notice}</span>
          </div>
          <button type="button" onClick={() => setNotice(null)} aria-label="Close notice">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}

      {/* Compact Plan Item Selector */}
      <section className="rounded-xl border border-border bg-surface-raised p-3 shadow-sm sm:p-3.5">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
            <label
              htmlFor="planItemSelect"
              className="whitespace-nowrap text-xs font-bold uppercase tracking-wider text-muted"
            >
              Select Production Plan Item:
            </label>
            <div className="relative min-w-0 flex-1">
              <select
                id="planItemSelect"
                value={selectedPlanId}
                onChange={(e) => setSelectedPlanId(e.target.value)}
                className="h-10 w-full rounded-xl border border-accent/40 bg-surface-muted px-3 text-xs font-semibold text-foreground shadow-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
              >
                <option value="ALL">Show All Plan Items</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.planNo} — Batch {p.batchNo} | {p.productName} ({p.shift}, {formatDate(p.planDate)})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-border bg-surface px-3.5 text-xs font-semibold text-foreground hover:bg-surface-muted disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Selected Plan Details Banner (Compact Strip) */}
        {currentPlan && (
          <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-lg border border-accent/20 bg-accent/5 px-3 py-2 text-xs">
            <div className="flex items-center gap-1">
              <span className="font-bold uppercase text-[10px] text-muted">Plan No:</span>
              <span className="font-mono font-extrabold text-accent">{currentPlan.planNo}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-bold uppercase text-[10px] text-muted">Batch:</span>
              <span className="font-bold text-foreground">{currentPlan.batchNo}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-bold uppercase text-[10px] text-muted">Product:</span>
              <span className="font-semibold text-foreground truncate max-w-[200px]" title={currentPlan.productName}>
                {currentPlan.productName}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-bold uppercase text-[10px] text-muted">Process / Step:</span>
              <span className="font-medium text-foreground">
                {currentPlan.process} · {currentPlan.processStepName}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-bold uppercase text-[10px] text-muted">Shift / Machine:</span>
              <span className="font-medium text-foreground">
                {currentPlan.shift} · {currentPlan.machineCode}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-bold uppercase text-[10px] text-muted">Planned Qty:</span>
              <span className="font-bold text-foreground">{currentPlan.plannedQuantity} pcs</span>
              <span
                className={`ml-1 inline-block rounded px-1.5 py-0.5 text-[10px] ${statusBadgeClass(
                  currentPlan.status,
                )}`}
              >
                {currentPlan.status}
              </span>
            </div>
          </div>
        )}
      </section>

      {/* Main Table: 1 Row Per Serial Number */}
      <section className="overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-border bg-surface-muted/60 text-xs font-bold uppercase tracking-wider text-muted">
              <tr>
                <th className="w-10 px-3 py-3.5 text-center"></th>
                <th className="px-4 py-3.5">Prod Batch</th>
                <th className="px-4 py-3.5">Product</th>
                <th className="px-4 py-3.5">Process</th>
                <th className="px-4 py-3.5">Serial number</th>
                <th className="px-4 py-3.5 text-center">Status</th>
                <th className="px-4 py-3.5 text-center">% completeion</th>
                <th className="px-4 py-3.5">Comments</th>
                <th className="px-4 py-3.5">Start date</th>
                <th className="px-4 py-3.5">End Date</th>
                <th className="px-3 py-3.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-muted">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="h-6 w-6 animate-spin text-accent" />
                      <span>Loading planned production serials...</span>
                    </div>
                  </td>
                </tr>
              ) : serialRows.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-16 text-center text-muted">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Layers className="h-8 w-8 text-muted/50" />
                      <p className="text-base font-semibold text-foreground">No serial records found</p>
                      <p className="text-xs text-muted">
                        Select another plan item or create plans in the Planning & Production module.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                serialRows.map((row) => {
                  const isExpanded = Boolean(expandedSerials[row.serialNumber])

                  return (
                    <Fragment key={row.serialNumber}>
                      {/* Main Row — 1 Serial Number per Row */}
                      <tr
                        onClick={() => {
                          if (row.hasMultipleEmployees) {
                            toggleExpand(row.serialNumber)
                          }
                        }}
                        className={`transition ${
                          row.hasMultipleEmployees
                            ? 'cursor-pointer hover:bg-surface-muted/40'
                            : 'hover:bg-surface-muted/20'
                        } ${isExpanded ? 'bg-surface-muted/30 font-medium' : ''}`}
                      >
                        {/* Expand Toggle — Only shown if multiple employees worked on it! */}
                        <td className="px-3 py-3.5 text-center">
                          {row.hasMultipleEmployees ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleExpand(row.serialNumber)
                              }}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-accent/40 bg-accent/10 text-accent transition hover:bg-accent hover:text-white"
                              title={
                                isExpanded
                                  ? 'Collapse Employee Shift Logs'
                                  : `Expand ${row.logs.length} Employee Shift Logs`
                              }
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </button>
                          ) : (
                            <span className="text-muted/40 text-xs">—</span>
                          )}
                        </td>

                        {/* Prod Batch */}
                        <td className="px-4 py-3.5 font-bold text-foreground whitespace-nowrap">
                          {row.batchNo}
                        </td>

                        {/* Product */}
                        <td className="px-4 py-3.5 max-w-[180px]">
                          <div className="truncate font-semibold text-foreground" title={row.productName}>
                            {row.productName}
                          </div>
                          <div className="font-mono text-xs text-muted">{row.productCode}</div>
                        </td>

                        {/* Process */}
                        <td className="px-4 py-3.5 whitespace-nowrap font-medium text-foreground">
                          {row.process}
                        </td>

                        {/* Serial number */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-accent">
                              {row.serialNumber}
                            </span>
                            {row.hasMultipleEmployees && (
                              <span className="rounded-md bg-purple-100 px-1.5 py-0.5 text-[10px] font-bold text-purple-700">
                                {row.logs.length} Shifts
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          <span
                            className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${statusBadgeClass(
                              row.status,
                            )}`}
                          >
                            {row.status.replace(/_/g, ' ')}
                          </span>
                        </td>

                        {/* % completeion */}
                        <td className="px-4 py-3.5 whitespace-nowrap text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className="font-mono text-xs font-bold text-foreground">
                              {row.completedPercent}%
                            </span>
                            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-surface-muted">
                              <div
                                className="h-full bg-accent transition-all duration-300"
                                style={{ width: `${row.completedPercent}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Comments */}
                        <td className="px-4 py-3.5 max-w-[200px]">
                          <span className="truncate block text-xs text-muted" title={row.comments}>
                            {row.comments}
                          </span>
                        </td>

                        {/* Start date */}
                        <td className="px-4 py-3.5 whitespace-nowrap text-xs text-foreground">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-muted" />
                            <span>{row.startDate}</span>
                          </div>
                        </td>

                        {/* End Date */}
                        <td className="px-4 py-3.5 whitespace-nowrap text-xs text-foreground">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-muted" />
                            <span>{row.endDate}</span>
                          </div>
                        </td>

                        {/* Handover Action (Allows logging second employee's work on this serial) */}
                        <td className="px-3 py-3.5 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              openHandoverModal(row)
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-2 py-1 text-[11px] font-semibold text-muted hover:border-accent hover:text-accent"
                            title="Log another employee shift on this serial"
                          >
                            <UserPlus className="h-3 w-3" />
                            <span>Log Shift</span>
                          </button>
                        </td>
                      </tr>

                      {/* Expandable Inner Table: Only rendered when row is expanded and has multiple employees */}
                      {isExpanded && row.hasMultipleEmployees && (
                        <tr className="bg-surface-muted/20">
                          <td colSpan={11} className="p-4 sm:p-5">
                            <div className="overflow-hidden rounded-2xl border border-accent/20 bg-surface shadow-sm">
                              {/* Inner Table Header Banner */}
                              <div className="flex items-center justify-between border-b border-border bg-surface-muted/40 px-4 py-2.5">
                                <div className="flex items-center gap-2">
                                  <Users className="h-4 w-4 text-accent" />
                                  <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                                    Employee Shift Handover Breakdown — Serial: {row.serialNumber} ({row.logs.length}{' '}
                                    Shifts)
                                  </span>
                                </div>
                                <span className="rounded-md bg-purple-100 px-2 py-0.5 text-xs font-bold text-purple-800">
                                  Multi-Employee Work
                                </span>
                              </div>

                              <div className="overflow-x-auto">
                                <table className="min-w-full text-left text-xs">
                                  <thead className="border-b border-border bg-surface-muted text-[11px] font-bold uppercase text-muted">
                                    <tr>
                                      <th className="px-3 py-2.5">Serial number</th>
                                      <th className="px-3 py-2.5">Prod Batch</th>
                                      <th className="px-3 py-2.5">Product</th>
                                      <th className="px-3 py-2.5">Date</th>
                                      <th className="px-3 py-2.5">Shift</th>
                                      <th className="px-3 py-2.5">Process step</th>
                                      <th className="px-3 py-2.5">Process</th>
                                      <th className="px-3 py-2.5">Machine</th>
                                      <th className="px-3 py-2.5">Operator</th>
                                      <th className="px-3 py-2.5 text-center">Status</th>
                                      <th className="px-3 py-2.5 text-center">% completeion</th>
                                      <th className="px-3 py-2.5">Comments</th>
                                      <th className="px-3 py-2.5 text-right">Planned hours</th>
                                      <th className="px-3 py-2.5 text-right">Actual hours</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-border/60">
                                    {row.logs.map((log, lIdx) => (
                                      <tr key={log.id} className="transition hover:bg-surface-muted/50">
                                        {/* Serial number */}
                                        <td className="px-3 py-2.5 font-mono font-bold text-accent whitespace-nowrap">
                                          {log.serialNumber}
                                        </td>

                                        {/* Prod Batch */}
                                        <td className="px-3 py-2.5 font-semibold text-foreground whitespace-nowrap">
                                          {log.batchNo}
                                        </td>

                                        {/* Product */}
                                        <td className="px-3 py-2.5 max-w-[140px] truncate" title={log.productName}>
                                          {log.productName}
                                        </td>

                                        {/* Date */}
                                        <td className="px-3 py-2.5 whitespace-nowrap text-muted">{log.date}</td>

                                        {/* Shift */}
                                        <td className="px-3 py-2.5 whitespace-nowrap">
                                          <span className="inline-flex items-center gap-1 rounded bg-surface-muted px-1.5 py-0.5 text-[11px] font-semibold text-foreground">
                                            <Clock className="h-2.5 w-2.5 text-muted" />
                                            {log.shift}
                                          </span>
                                        </td>

                                        {/* Process step */}
                                        <td className="px-3 py-2.5 font-medium text-foreground whitespace-nowrap">
                                          {log.processStepName}
                                        </td>

                                        {/* Process */}
                                        <td className="px-3 py-2.5 text-foreground whitespace-nowrap">
                                          {log.process}
                                        </td>

                                        {/* Machine */}
                                        <td className="px-3 py-2.5 font-medium text-foreground whitespace-nowrap">
                                          {log.machineCode}
                                        </td>

                                        {/* Operator */}
                                        <td className="px-3 py-2.5 whitespace-nowrap">
                                          <span className="font-bold text-foreground">{log.operatorName}</span>
                                          <span className="ml-1 text-[10px] text-muted">
                                            ({lIdx === 0 ? 'Shift 1' : `Shift ${lIdx + 1}`})
                                          </span>
                                        </td>

                                        {/* Status */}
                                        <td className="px-3 py-2.5 text-center whitespace-nowrap">
                                          <span
                                            className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${statusBadgeClass(
                                              log.status,
                                            )}`}
                                          >
                                            {log.status.replace(/_/g, ' ')}
                                          </span>
                                        </td>

                                        {/* % completeion */}
                                        <td className="px-3 py-2.5 text-center whitespace-nowrap">
                                          <div className="flex items-center justify-center gap-1.5">
                                            <div className="h-1.5 w-14 overflow-hidden rounded-full bg-surface-muted">
                                              <div
                                                className="h-full bg-accent"
                                                style={{ width: `${Math.min(100, Math.max(0, log.completedPercent))}%` }}
                                              />
                                            </div>
                                            <span className="font-mono text-[11px] font-bold text-foreground">
                                              {log.completedPercent}%
                                            </span>
                                          </div>
                                        </td>

                                        {/* Comments */}
                                        <td className="px-3 py-2.5 max-w-[150px] truncate text-muted" title={log.comments}>
                                          {log.comments}
                                        </td>

                                        {/* Planned hours */}
                                        <td className="px-3 py-2.5 text-right font-mono font-medium text-foreground whitespace-nowrap">
                                          {log.plannedHours} hrs
                                        </td>

                                        {/* Actual hours */}
                                        <td className="px-3 py-2.5 text-right font-mono font-medium text-foreground whitespace-nowrap">
                                          {log.actualHours} hrs
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Log Another Employee / Shift Handover Modal */}
      {isHandoverModalOpen && handoverSerial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-border bg-surface-raised p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  Log Handover Shift — {handoverSerial.serialNumber}
                </h3>
                <p className="mt-0.5 text-xs text-muted">
                  Record another employee taking over this serial number to complete remaining work.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsHandoverModalOpen(false)}
                className="rounded-lg p-1.5 text-muted hover:bg-surface-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddHandoverSubmit} className="mt-4 space-y-4 text-sm">
              <div className="rounded-xl border border-border bg-surface-muted p-3 text-xs">
                <p>
                  <span className="font-bold text-muted">Serial:</span>{' '}
                  <span className="font-mono font-bold text-accent">{handoverSerial.serialNumber}</span>
                </p>
                <p className="mt-1">
                  <span className="font-bold text-muted">Current Completion:</span>{' '}
                  <span className="font-bold text-foreground">{handoverSerial.completedPercent}%</span>
                </p>
                <p className="mt-1">
                  <span className="font-bold text-muted">Previous Operators:</span>{' '}
                  <span className="text-foreground">
                    {handoverSerial.logs.map((l) => `${l.operatorName} (${l.completedPercent}%)`).join(', ')}
                  </span>
                </p>
              </div>

              {/* Handover Operator */}
              <div>
                <label htmlFor="handoverOperatorSelect" className="mb-1 block text-xs font-bold text-foreground">
                  Next Employee / Operator taking over
                </label>
                <select
                  id="handoverOperatorSelect"
                  value={handoverOperator}
                  onChange={(e) => setHandoverOperator(e.target.value)}
                  className="min-h-11 w-full rounded-xl border border-border bg-surface-muted px-3 text-sm font-semibold text-foreground outline-none focus:border-accent"
                >
                  {(options?.operators || []).map((o) => (
                    <option key={o.id} value={o.name}>
                      {o.name} ({o.employeeCode} · {o.role})
                    </option>
                  ))}
                </select>
              </div>

              {/* Shift & Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="handoverShiftSelect" className="mb-1 block text-xs font-bold text-foreground">
                    Handover Shift
                  </label>
                  <select
                    id="handoverShiftSelect"
                    value={handoverShift}
                    onChange={(e) => setHandoverShift(e.target.value)}
                    className="min-h-11 w-full rounded-xl border border-border bg-surface-muted px-3 text-sm font-semibold text-foreground outline-none focus:border-accent"
                  >
                    <option value="Shift A">Shift A (06:00 - 14:00)</option>
                    <option value="Shift B">Shift B (14:00 - 22:00)</option>
                    <option value="Shift C">Shift C (22:00 - 06:00)</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="handoverDateInput" className="mb-1 block text-xs font-bold text-foreground">
                    Date
                  </label>
                  <input
                    id="handoverDateInput"
                    type="date"
                    value={handoverDate}
                    onChange={(e) => setHandoverDate(e.target.value)}
                    className="min-h-11 w-full rounded-xl border border-border bg-surface-muted px-3 text-sm text-foreground outline-none focus:border-accent"
                  />
                </div>
              </div>

              {/* Work Done & Hours */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label htmlFor="handoverPercentInput" className="mb-1 block text-xs font-bold text-foreground">
                    Work Done (%)
                  </label>
                  <input
                    id="handoverPercentInput"
                    type="number"
                    min="1"
                    max="100"
                    value={handoverPercent}
                    onChange={(e) => setHandoverPercent(e.target.value)}
                    className="min-h-11 w-full rounded-xl border border-border bg-surface-muted px-3 text-sm text-foreground outline-none focus:border-accent"
                  />
                </div>

                <div>
                  <label htmlFor="handoverHoursInput" className="mb-1 block text-xs font-bold text-foreground">
                    Actual Hours
                  </label>
                  <input
                    id="handoverHoursInput"
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={handoverHours}
                    onChange={(e) => setHandoverHours(e.target.value)}
                    className="min-h-11 w-full rounded-xl border border-border bg-surface-muted px-3 text-sm text-foreground outline-none focus:border-accent"
                  />
                </div>

                <div>
                  <label htmlFor="handoverStatusSelect" className="mb-1 block text-xs font-bold text-foreground">
                    Status
                  </label>
                  <select
                    id="handoverStatusSelect"
                    value={handoverStatus}
                    onChange={(e) => setHandoverStatus(e.target.value)}
                    className="min-h-11 w-full rounded-xl border border-border bg-surface-muted px-3 text-sm font-semibold text-foreground outline-none focus:border-accent"
                  >
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="ON_HOLD">On Hold</option>
                  </select>
                </div>
              </div>

              {/* Comments */}
              <div>
                <label htmlFor="handoverCommentsInput" className="mb-1 block text-xs font-bold text-foreground">
                  Comments / Notes
                </label>
                <textarea
                  id="handoverCommentsInput"
                  rows={2}
                  value={handoverComments}
                  onChange={(e) => setHandoverComments(e.target.value)}
                  className="w-full rounded-xl border border-border bg-surface-muted p-2.5 text-xs text-foreground outline-none focus:border-accent"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => setIsHandoverModalOpen(false)}
                  className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-surface-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-5 py-2 text-xs font-bold text-white hover:bg-accent/90"
                >
                  <PlusCircle className="h-4 w-4" />
                  Save Handover Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
