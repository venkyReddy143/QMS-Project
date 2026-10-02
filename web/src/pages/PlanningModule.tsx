import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  Calendar,
  CheckCircle2,
  Clock,
  Layers,
  PlusCircle,
  RefreshCw,
  Search,
  Users,
  X,
  AlertCircle,
  Cpu,
} from 'lucide-react'
import { SearchableSelect } from '../components/SearchableSelect'
import { RowActionsMenu } from '../components/RowActionsMenu'
import {
  createPlanApi,
  deletePlanApi,
  fetchPlanningOptionsApi,
  fetchPlansApi,
  updatePlanApi,
} from '../lib/api/planning'
import type {
  CreatePlanPayload,
  PlanStatus,
  PlanningOptions,
  ProductionPlan,
  UpdatePlanPayload,
} from '../types/planning'

function todayIso(): string {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDate(isoDate: string | undefined): string {
  if (!isoDate) return '—'
  const d = new Date(isoDate)
  if (Number.isNaN(d.getTime())) return isoDate
  return d.toISOString().slice(0, 10)
}

function statusBadgeClass(status: PlanStatus): string {
  switch (status) {
    case 'PLANNED':
      return 'bg-blue-100 text-blue-800 border border-blue-200'
    case 'IN_PROGRESS':
      return 'bg-amber-100 text-amber-800 border border-amber-200'
    case 'COMPLETED':
      return 'bg-emerald-100 text-emerald-800 border border-emerald-200'
    case 'ON_HOLD':
      return 'bg-purple-100 text-purple-800 border border-purple-200'
    case 'CANCELLED':
      return 'bg-red-100 text-red-800 border border-red-200'
    default:
      return 'bg-slate-100 text-slate-800 border border-slate-200'
  }
}

interface FormState {
  batchId: string
  productId: string
  startDate: string
  endDate: string
  shift: string
  processStepName: string
  processStepInfo: string
  process: string
  machineId: string
  operatorId: string
  plannedQuantity: string
  notes: string
  status: PlanStatus
}

const initialFormState: FormState = {
  batchId: '',
  productId: '',
  startDate: todayIso(),
  endDate: todayIso(),
  shift: 'Shift A',
  processStepName: '',
  processStepInfo: '',
  process: '',
  machineId: '',
  operatorId: '',
  plannedQuantity: '',
  notes: '',
  status: 'PLANNED',
}

export function PlanningModule() {
  const [plans, setPlans] = useState<ProductionPlan[]>([])
  const [options, setOptions] = useState<PlanningOptions | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'CUSTOM'>('ALL')
  const [customDate, setCustomDate] = useState(todayIso())
  const [shiftFilter, setShiftFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<ProductionPlan | null>(null)
  const [form, setForm] = useState<FormState>(initialFormState)
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const [saving, setSaving] = useState(false)

  // Delete State
  const [deletingPlan, setDeletingPlan] = useState<ProductionPlan | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Initial Load
  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    setLoading(true)
    setError(null)
    try {
      const [optsRes, plansRes] = await Promise.all([
        fetchPlanningOptionsApi(),
        fetchPlansApi(),
      ])

      if (optsRes.options) {
        setOptions(optsRes.options)
      }
      if (plansRes.plans) {
        setPlans(plansRes.plans)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load planning data.')
    } finally {
      setLoading(false)
    }
  }

  async function refreshPlans() {
    setRefreshing(true)
    try {
      const filterParams: Record<string, string> = {}
      if (dateFilter === 'TODAY') filterParams.date = todayIso()
      else if (dateFilter === 'CUSTOM' && customDate) filterParams.date = customDate
      if (shiftFilter !== 'ALL') filterParams.shift = shiftFilter
      if (statusFilter !== 'ALL') filterParams.status = statusFilter
      if (searchTerm.trim()) filterParams.search = searchTerm.trim()

      const res = await fetchPlansApi(filterParams)
      if (res.plans) {
        setPlans(res.plans)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh plans.')
    } finally {
      setRefreshing(false)
    }
  }

  // Auto reload when filters change
  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => {
        refreshPlans()
      }, 250)
      return () => clearTimeout(timer)
    }
  }, [dateFilter, customDate, shiftFilter, statusFilter, searchTerm])

  // Clear notice after 5s
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [successMessage])

  // Select dropdown option builders
  const batchOptions = useMemo(() => {
    if (!options?.batches) return []
    return options.batches.map((b) => ({
      value: b.id,
      label: `${b.batchNo} — ${b.productName || 'Batch'}`,
      subLabel: b.orderNo ? `Order: ${b.orderNo} | Planned: ${b.plannedQuantity} pcs` : `Planned: ${b.plannedQuantity} pcs`,
    }))
  }, [options])

  const productOptions = useMemo(() => {
    if (!options?.products) return []
    return options.products.map((p) => ({
      value: p.id,
      label: `${p.productCode} — ${p.name}`,
      subLabel: `UOM: ${p.uom} | Type: ${p.productType}`,
    }))
  }, [options])

  const machineOptions = useMemo(() => {
    if (!options?.machines) return []
    return options.machines.map((m) => ({
      value: m.id,
      label: `${m.machineCode} — ${m.name}`,
      subLabel: `${m.machineType}${m.bay ? ` · Bay ${m.bay}` : ''} | Status: ${m.status}`,
      badge: m.status,
    }))
  }, [options])

  const operatorOptions = useMemo(() => {
    if (!options?.operators) return []
    return options.operators.map((u) => ({
      value: u.id,
      label: u.name,
      subLabel: `${u.employeeCode} · ${u.role}`,
    }))
  }, [options])

  const shiftOptions = useMemo(() => {
    if (!options?.shifts) {
      return [
        { value: 'Shift A', label: 'Shift A (06:00 - 14:00)' },
        { value: 'Shift B', label: 'Shift B (14:00 - 22:00)' },
        { value: 'Shift C', label: 'Shift C (22:00 - 06:00)' },
      ]
    }
    return options.shifts.map((s) => ({
      value: s.name || s.shiftCode,
      label: s.name ? `${s.name} (${s.startTime} - ${s.endTime})` : `Shift ${s.shiftCode}`,
      subLabel: `${s.startTime} - ${s.endTime}`,
    }))
  }, [options])

  // Process Step Suggestions for current batch / master
  const currentBatch = useMemo(
    () => options?.batches.find((b) => b.id === form.batchId),
    [options, form.batchId],
  )

  const availableProcessStepNames = useMemo(() => {
    if (currentBatch && currentBatch.processStepNames && currentBatch.processStepNames.length > 0) {
      return currentBatch.processStepNames
    }
    if (options?.processSteps) {
      return options.processSteps.map((s) => s.name)
    }
    return ['Casting', 'CNC Machining', 'Coating', 'NDT Testing', 'Final Inspection', 'Packing']
  }, [currentBatch, options])

  // Reactive Batch Selection: Auto-fills Product, Process Steps & Planned Qty
  function handleBatchChange(batchId: string) {
    const selected = options?.batches.find((b) => b.id === batchId)
    if (selected) {
      const firstStep =
        (selected.processStepNames && selected.processStepNames[0]) ||
        (selected.processMachines && selected.processMachines[0]?.processStepName) ||
        ''

      // Attempt to map matching process category
      const stepMaster = options?.processSteps.find(
        (s) => s.name.toLowerCase() === firstStep.toLowerCase(),
      )
      const defaultProcess = stepMaster?.category || firstStep || ''

      // Attempt to find pre-assigned machine for first step
      const stepMachineMapping = selected.processMachines?.find(
        (pm) => pm.processStepName.toLowerCase() === firstStep.toLowerCase(),
      )
      const suggestedMachineId = stepMachineMapping?.machineId || form.machineId

      setForm((prev) => ({
        ...prev,
        batchId,
        productId: selected.productId || prev.productId,
        plannedQuantity: prev.plannedQuantity || String(selected.plannedQuantity || ''),
        processStepName: firstStep || prev.processStepName,
        process: defaultProcess || prev.process,
        machineId: suggestedMachineId,
      }))
    } else {
      setForm((prev) => ({ ...prev, batchId }))
    }
  }

  // Handle Process Step Selection: auto-suggests process category & machine
  function handleProcessStepChange(stepName: string) {
    const stepMaster = options?.processSteps.find(
      (s) => s.name.toLowerCase() === stepName.toLowerCase(),
    )
    const suggestedCategory = stepMaster?.category || stepName

    // If batch has a machine configured for this step, auto-select it
    let suggestedMachine = form.machineId
    if (currentBatch?.processMachines) {
      const pm = currentBatch.processMachines.find(
        (item) => item.processStepName.toLowerCase() === stepName.toLowerCase(),
      )
      if (pm?.machineId) {
        suggestedMachine = pm.machineId
      }
    }

    setForm((prev) => ({
      ...prev,
      processStepName: stepName,
      process: prev.process || suggestedCategory,
      machineId: suggestedMachine,
    }))
  }

  function openCreateModal() {
    setEditingPlan(null)
    setForm({
      ...initialFormState,
      startDate: todayIso(),
      endDate: todayIso(),
      shift: shiftOptions[0]?.value || 'Shift A',
    })
    setFormErrors({})
    setIsModalOpen(true)
  }

  function openEditModal(plan: ProductionPlan) {
    setEditingPlan(plan)
    const effectiveStart = plan.startDate
      ? plan.startDate.slice(0, 10)
      : (plan.planDate ? plan.planDate.slice(0, 10) : todayIso())
    const effectiveEnd = plan.endDate
      ? plan.endDate.slice(0, 10)
      : effectiveStart

    setForm({
      batchId: plan.batchId,
      productId: plan.productId,
      startDate: effectiveStart,
      endDate: effectiveEnd,
      shift: plan.shift,
      processStepName: plan.processStepName,
      processStepInfo: plan.processStepInfo || '',
      process: plan.process,
      machineId: plan.machineId,
      operatorId: plan.operatorId,
      plannedQuantity: String(plan.plannedQuantity),
      notes: plan.notes || '',
      status: plan.status,
    })
    setFormErrors({})
    setIsModalOpen(true)
  }

  function validateForm(): boolean {
    const errors: Partial<Record<keyof FormState, string>> = {}
    if (!form.batchId) errors.batchId = 'Please select a production batch.'
    if (!form.productId) errors.productId = 'Please select a product.'
    if (!form.startDate) errors.startDate = 'Start date is required.'
    if (!form.endDate) errors.endDate = 'End date is required.'
    if (form.startDate && form.endDate && form.endDate < form.startDate) {
      errors.endDate = 'End date cannot be earlier than start date.'
    }
    if (!form.shift) errors.shift = 'Shift is required.'
    if (!form.processStepName.trim()) errors.processStepName = 'Process step is required.'
    if (!form.process.trim()) errors.process = 'Process is required.'
    if (!form.machineId) errors.machineId = 'Please select a machine.'
    if (!form.operatorId) errors.operatorId = 'Please select an operator.'
    const qty = Number(form.plannedQuantity)
    if (!qty || qty <= 0 || !Number.isInteger(qty)) {
      errors.plannedQuantity = 'Enter a valid whole planned quantity (min 1).'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!validateForm()) return

    setSaving(true)
    setError(null)

    try {
      if (editingPlan) {
        const payload: UpdatePlanPayload = {
          batchId: form.batchId,
          productId: form.productId,
          planDate: form.startDate,
          startDate: form.startDate,
          endDate: form.endDate,
          shift: form.shift,
          processStepName: form.processStepName.trim(),
          processStepInfo: form.processStepInfo.trim(),
          process: form.process.trim(),
          machineId: form.machineId,
          operatorId: form.operatorId,
          plannedQuantity: Number(form.plannedQuantity),
          notes: form.notes.trim(),
          status: form.status,
        }

        const res = await updatePlanApi(editingPlan.id, payload)
        if (res.success && res.plan) {
          setSuccessMessage(res.message || 'Production plan updated.')
          setIsModalOpen(false)
          refreshPlans()
        }
      } else {
        const payload: CreatePlanPayload = {
          batchId: form.batchId,
          productId: form.productId,
          planDate: form.startDate,
          startDate: form.startDate,
          endDate: form.endDate,
          shift: form.shift,
          processStepName: form.processStepName.trim(),
          processStepInfo: form.processStepInfo.trim(),
          process: form.process.trim(),
          machineId: form.machineId,
          operatorId: form.operatorId,
          plannedQuantity: Number(form.plannedQuantity),
          notes: form.notes.trim(),
          status: form.status,
        }

        const res = await createPlanApi(payload)
        if (res.success && res.plan) {
          setSuccessMessage(res.message || 'Production plan created successfully.')
          setIsModalOpen(false)
          refreshPlans()
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save production plan.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteConfirm() {
    if (!deletingPlan) return
    setIsDeleting(true)
    try {
      const res = await deletePlanApi(deletingPlan.id)
      if (res.success) {
        setSuccessMessage(res.message || `Plan ${deletingPlan.planNo} deleted.`)
        setDeletingPlan(null)
        refreshPlans()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete plan.')
    } finally {
      setIsDeleting(false)
    }
  }

  // Summary Metrics
  const stats = useMemo(() => {
    const today = todayIso()
    const todayPlans = plans.filter((p) => {
      const start = p.startDate ? p.startDate.slice(0, 10) : (p.planDate ? p.planDate.slice(0, 10) : '')
      const end = p.endDate ? p.endDate.slice(0, 10) : start
      return (start && end && start <= today && today <= end) || (p.planDate && p.planDate.slice(0, 10) === today)
    })
    const totalQty = plans.reduce((acc, p) => acc + (p.plannedQuantity || 0), 0)
    const inProgress = plans.filter((p) => p.status === 'IN_PROGRESS').length
    const uniqueMachines = new Set(plans.map((p) => p.machineId)).size
    const uniqueOperators = new Set(plans.map((p) => p.operatorId)).size

    return {
      total: plans.length,
      todayCount: todayPlans.length,
      totalQty,
      inProgress,
      uniqueMachines,
      uniqueOperators,
    }
  }, [plans])

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <section className="flex flex-col gap-4 rounded-2xl border border-border bg-surface-raised p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <Layers className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Production Planning Module</h1>
              <p className="text-sm text-muted">
                Create, schedule, and allocate shift plans across batches, machines, and operators.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={refreshPlans}
            disabled={refreshing}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-surface px-4 text-sm font-semibold text-foreground hover:bg-surface-muted disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-accent px-5 text-sm font-bold text-white shadow hover:bg-accent/90"
          >
            <PlusCircle className="h-4 w-4" />
            Create Plan
          </button>
        </div>
      </section>

      {/* Global Alerts */}
      {error ? (
        <div className="flex items-center justify-between rounded-xl border border-danger/30 bg-red-50/70 px-4 py-3 text-sm font-semibold text-danger">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button type="button" onClick={() => setError(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {successMessage ? (
        <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-50/70 px-4 py-3 text-sm font-semibold text-emerald-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
          <button type="button" onClick={() => setSuccessMessage(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {/* Statistics Cards */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-border bg-surface-raised p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">Total Plans</p>
          <p className="mt-2 text-3xl font-extrabold text-foreground">{stats.total}</p>
          <p className="mt-1 text-xs text-muted">Across all batches</p>
        </div>

        <div className="rounded-2xl border border-border bg-surface-raised p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">Today's Schedule</p>
          <p className="mt-2 text-3xl font-extrabold text-accent">{stats.todayCount}</p>
          <p className="mt-1 text-xs text-muted">Plans active for {todayIso()}</p>
        </div>

        <div className="rounded-2xl border border-border bg-surface-raised p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">Planned Volume</p>
          <p className="mt-2 text-3xl font-extrabold text-foreground">
            {stats.totalQty.toLocaleString()} <span className="text-sm font-normal text-muted">pcs</span>
          </p>
          <p className="mt-1 text-xs text-muted">Total scheduled pieces</p>
        </div>

        <div className="rounded-2xl border border-border bg-surface-raised p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">Resources Allocated</p>
          <div className="mt-2 flex items-center gap-3">
            <span className="flex items-center gap-1 text-lg font-bold text-foreground">
              <Cpu className="h-4 w-4 text-muted" /> {stats.uniqueMachines}
            </span>
            <span className="text-muted">·</span>
            <span className="flex items-center gap-1 text-lg font-bold text-foreground">
              <Users className="h-4 w-4 text-muted" /> {stats.uniqueOperators}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted">Machines & Operators</p>
        </div>
      </section>

      {/* Filters & Action Bar */}
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface-raised p-4 shadow-sm">
        {/* Search */}
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search plan no, batch, product, machine, operator..."
            className="min-h-11 w-full rounded-xl border border-border bg-surface-muted pl-9 pr-3 text-sm text-foreground outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Date Filter */}
        <div className="flex items-center gap-1 rounded-xl border border-border bg-surface-muted p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setDateFilter('ALL')}
            className={`rounded-lg px-3 py-1.5 transition ${
              dateFilter === 'ALL'
                ? 'bg-surface font-bold text-foreground shadow-sm'
                : 'text-muted hover:text-foreground'
            }`}
          >
            All Dates
          </button>
          <button
            type="button"
            onClick={() => setDateFilter('TODAY')}
            className={`rounded-lg px-3 py-1.5 transition ${
              dateFilter === 'TODAY'
                ? 'bg-surface font-bold text-foreground shadow-sm'
                : 'text-muted hover:text-foreground'
            }`}
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setDateFilter('CUSTOM')}
            className={`rounded-lg px-3 py-1.5 transition ${
              dateFilter === 'CUSTOM'
                ? 'bg-surface font-bold text-foreground shadow-sm'
                : 'text-muted hover:text-foreground'
            }`}
          >
            Custom Date
          </button>
        </div>

        {dateFilter === 'CUSTOM' && (
          <input
            type="date"
            value={customDate}
            onChange={(e) => setCustomDate(e.target.value)}
            className="min-h-11 rounded-xl border border-border bg-surface-muted px-3 text-sm text-foreground outline-none focus:border-accent"
          />
        )}

        {/* Shift Filter */}
        <select
          value={shiftFilter}
          onChange={(e) => setShiftFilter(e.target.value)}
          aria-label="Filter by shift"
          className="min-h-11 rounded-xl border border-border bg-surface-muted px-3 text-sm font-semibold text-foreground outline-none focus:border-accent"
        >
          <option value="ALL">All Shifts</option>
          {shiftOptions.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter by status"
          className="min-h-11 rounded-xl border border-border bg-surface-muted px-3 text-sm font-semibold text-foreground outline-none focus:border-accent"
        >
          <option value="ALL">All Statuses</option>
          <option value="PLANNED">Planned</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="COMPLETED">Completed</option>
          <option value="ON_HOLD">On Hold</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </section>

      {/* Plans Table */}
      <section className="overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-border bg-surface-muted/60 text-xs font-bold uppercase tracking-wider text-muted">
              <tr>
                <th className="px-4 py-3.5">Actions</th>
                <th className="px-4 py-3.5">Plan & Date</th>
                <th className="px-4 py-3.5">Prod Batch</th>
                <th className="px-4 py-3.5">Product</th>
                <th className="px-4 py-3.5">Shift</th>
                <th className="px-4 py-3.5">Process Step (Information)</th>
                <th className="px-4 py-3.5">Process</th>
                <th className="px-4 py-3.5">Machine</th>
                <th className="px-4 py-3.5">Operator</th>
                <th className="px-4 py-3.5 text-right">Planned Qty</th>
                <th className="px-4 py-3.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-muted">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="h-6 w-6 animate-spin text-accent" />
                      <span>Loading production plans...</span>
                    </div>
                  </td>
                </tr>
              ) : plans.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-16 text-center text-muted">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-muted text-muted">
                        <Layers className="h-6 w-6" />
                      </div>
                      <p className="text-base font-semibold text-foreground">No production plans found</p>
                      <p className="text-xs text-muted max-w-sm">
                        Create your first shift plan or adjust search filters to view planned production.
                      </p>
                      <button
                        type="button"
                        onClick={openCreateModal}
                        className="mt-2 inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-xs font-bold text-white hover:bg-accent/90"
                      >
                        <PlusCircle className="h-4 w-4" />
                        Create Plan
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                plans.map((plan) => (
                  <tr key={plan.id} className="transition hover:bg-surface-muted/40">
                    {/* Actions */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <RowActionsMenu
                        label={`Actions for ${plan.planNo}`}
                        actions={[
                          { label: 'Edit Plan', onClick: () => openEditModal(plan) },
                          {
                            label: 'Delete Plan',
                            onClick: () => setDeletingPlan(plan),
                            danger: true,
                          },
                        ]}
                      />
                    </td>

                    {/* Plan No & Date */}
                    <td className="px-4 py-3.5">
                      <div className="font-mono text-sm font-bold text-accent">{plan.planNo}</div>
                      <div className="flex items-center gap-1 text-xs text-muted">
                        <Calendar className="h-3 w-3 shrink-0" />
                        {plan.startDate && plan.endDate && plan.startDate !== plan.endDate ? (
                          <span className="whitespace-nowrap">
                            {formatDate(plan.startDate)} <span className="text-[10px] text-muted/70">to</span> {formatDate(plan.endDate)}
                          </span>
                        ) : (
                          <span className="whitespace-nowrap">{formatDate(plan.startDate || plan.planDate)}</span>
                        )}
                      </div>
                    </td>

                    {/* Prod Batch */}
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-foreground">{plan.batchNo}</div>
                      {plan.orderNo && (
                        <div className="text-xs text-muted">Ord: {plan.orderNo}</div>
                      )}
                    </td>

                    {/* Product */}
                    <td className="px-4 py-3.5 max-w-[180px]">
                      <div className="truncate font-semibold text-foreground" title={plan.productName}>
                        {plan.productName}
                      </div>
                      <div className="font-mono text-xs text-muted">{plan.productCode}</div>
                    </td>

                    {/* Shift */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 rounded-md bg-surface-muted px-2 py-1 text-xs font-bold text-foreground">
                        <Clock className="h-3 w-3 text-muted" />
                        {plan.shift}
                      </span>
                    </td>

                    {/* Process Step (Information) */}
                    <td className="px-4 py-3.5 max-w-[220px]">
                      <div className="font-semibold text-foreground">{plan.processStepName}</div>
                      {plan.processStepInfo ? (
                        <div
                          className="mt-0.5 truncate text-xs text-muted italic"
                          title={plan.processStepInfo}
                        >
                          {plan.processStepInfo}
                        </div>
                      ) : (
                        <span className="text-xs text-muted/60">—</span>
                      )}
                    </td>

                    {/* Process */}
                    <td className="px-4 py-3.5 whitespace-nowrap font-medium text-foreground">
                      {plan.process}
                    </td>

                    {/* Machine */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="font-semibold text-foreground">{plan.machineCode}</div>
                      <div className="text-xs text-muted">{plan.machineName}</div>
                    </td>

                    {/* Operator */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="font-semibold text-foreground">{plan.operatorName}</div>
                      {plan.operatorCode && (
                        <div className="text-xs text-muted">{plan.operatorCode}</div>
                      )}
                    </td>

                    {/* Planned Quantity */}
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <div className="text-base font-extrabold text-foreground">
                        {plan.plannedQuantity.toLocaleString()}{' '}
                        <span className="text-xs font-normal text-muted">pcs</span>
                      </div>
                      {/* Forward-looking actuals for Production Module */}
                      {plan.actualQuantity > 0 && (
                        <div className="text-[11px] font-semibold text-emerald-700">
                          Actual: {plan.actualQuantity} pcs
                        </div>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5 text-center whitespace-nowrap">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${statusBadgeClass(
                          plan.status,
                        )}`}
                      >
                        {plan.status.replace(/_/g, ' ')}
                      </span>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="relative max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-border bg-surface-raised p-6 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  {editingPlan ? `Edit Production Plan — ${editingPlan.planNo}` : 'Create New Production Plan'}
                </h3>
                <p className="mt-0.5 text-xs text-muted">
                  Assign Prod Batch, Product, Start Date, End Date, Shift, Process Step & Info, Machine, Operator, and Planned Qty.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1.5 text-muted hover:bg-surface-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="mt-4 space-y-3">
              {/* Row 1: Prod Batch & Product */}
              <div className="grid gap-3 sm:grid-cols-2">
                <SearchableSelect
                  label="Prod Batch"
                  required
                  size="sm"
                  placeholder="Select batch..."
                  options={batchOptions}
                  value={form.batchId}
                  onChange={handleBatchChange}
                  error={formErrors.batchId}
                />

                <SearchableSelect
                  label="Product"
                  required
                  size="sm"
                  placeholder="Select product..."
                  options={productOptions}
                  value={form.productId}
                  onChange={(val) => setForm((prev) => ({ ...prev, productId: val }))}
                  error={formErrors.productId}
                />
              </div>

              {/* Row 2: Start Date, End Date, Shift */}
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label htmlFor="startDateInput" className="mb-1 block text-xs font-bold text-foreground">
                    Start Date <span className="text-danger">*</span>
                  </label>
                  <input
                    id="startDateInput"
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm((prev) => ({ ...prev, startDate: e.target.value }))}
                    className="h-9 min-h-[36px] w-full rounded-lg border border-border bg-surface-muted px-2.5 text-xs text-foreground outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                  />
                  {formErrors.startDate && (
                    <p className="mt-1 text-xs font-semibold text-danger">{formErrors.startDate}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="endDateInput" className="mb-1 block text-xs font-bold text-foreground">
                    End Date <span className="text-danger">*</span>
                  </label>
                  <input
                    id="endDateInput"
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm((prev) => ({ ...prev, endDate: e.target.value }))}
                    className="h-9 min-h-[36px] w-full rounded-lg border border-border bg-surface-muted px-2.5 text-xs text-foreground outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                  />
                  {formErrors.endDate && (
                    <p className="mt-1 text-xs font-semibold text-danger">{formErrors.endDate}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="shiftSelect" className="mb-1 block text-xs font-bold text-foreground">
                    Shift <span className="text-danger">*</span>
                  </label>
                  <select
                    id="shiftSelect"
                    value={form.shift}
                    onChange={(e) => setForm((prev) => ({ ...prev, shift: e.target.value }))}
                    className="h-9 min-h-[36px] w-full rounded-lg border border-border bg-surface-muted px-2.5 text-xs text-foreground outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                  >
                    {shiftOptions.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                  {formErrors.shift && (
                    <p className="mt-1 text-xs font-semibold text-danger">{formErrors.shift}</p>
                  )}
                </div>
              </div>

              {/* Row 3: Process Step (Information) & Process */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="processStepInput" className="mb-1 block text-xs font-bold text-foreground">
                    Process Step <span className="text-danger">*</span>
                  </label>
                  <input
                    id="processStepInput"
                    type="text"
                    list="processStepOptionsList"
                    value={form.processStepName}
                    onChange={(e) => handleProcessStepChange(e.target.value)}
                    placeholder="e.g. CNC Machining, Casting..."
                    className="h-9 min-h-[36px] w-full rounded-lg border border-border bg-surface-muted px-2.5 text-xs text-foreground outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                  />
                  <datalist id="processStepOptionsList">
                    {availableProcessStepNames.map((name) => (
                      <option key={name} value={name} />
                    ))}
                  </datalist>
                  {formErrors.processStepName && (
                    <p className="mt-1 text-xs font-semibold text-danger">{formErrors.processStepName}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="processInput" className="mb-1 block text-xs font-bold text-foreground">
                    Process <span className="text-danger">*</span>
                  </label>
                  <input
                    id="processInput"
                    type="text"
                    value={form.process}
                    onChange={(e) => setForm((prev) => ({ ...prev, process: e.target.value }))}
                    placeholder="e.g. CNC, Machining, Coating, Inspection..."
                    className="h-9 min-h-[36px] w-full rounded-lg border border-border bg-surface-muted px-2.5 text-xs text-foreground outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                  />
                  {formErrors.process && (
                    <p className="mt-1 text-xs font-semibold text-danger">{formErrors.process}</p>
                  )}
                </div>
              </div>

              {/* Process Step Information (Notes, tolerance, drawing instructions) */}
              <div>
                <label htmlFor="stepInfoInput" className="mb-1 block text-xs font-bold text-foreground">
                  Process Step (Information)
                </label>
                <input
                  id="stepInfoInput"
                  type="text"
                  value={form.processStepInfo}
                  onChange={(e) => setForm((prev) => ({ ...prev, processStepInfo: e.target.value }))}
                  placeholder="Additional step details, tolerance instructions, drawing specs, or parameters..."
                  className="h-9 min-h-[36px] w-full rounded-lg border border-border bg-surface-muted px-2.5 text-xs text-foreground outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                />
              </div>

              {/* Row 4: Machine & Operator */}
              <div className="grid gap-3 sm:grid-cols-2">
                <SearchableSelect
                  label="Machine"
                  required
                  size="sm"
                  placeholder="Select machine..."
                  options={machineOptions}
                  value={form.machineId}
                  onChange={(val) => setForm((prev) => ({ ...prev, machineId: val }))}
                  error={formErrors.machineId}
                />

                <SearchableSelect
                  label="Operator"
                  required
                  size="sm"
                  placeholder="Select operator..."
                  options={operatorOptions}
                  value={form.operatorId}
                  onChange={(val) => setForm((prev) => ({ ...prev, operatorId: val }))}
                  error={formErrors.operatorId}
                />
              </div>

              {/* Row 5: Planned Quantity & Status */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="plannedQtyInput" className="mb-1 block text-xs font-bold text-foreground">
                    Planned Quantity (pcs) <span className="text-danger">*</span>
                  </label>
                  <input
                    id="plannedQtyInput"
                    type="number"
                    min="1"
                    step="1"
                    value={form.plannedQuantity}
                    onChange={(e) => setForm((prev) => ({ ...prev, plannedQuantity: e.target.value }))}
                    placeholder="Enter planned quantity..."
                    className="h-9 min-h-[36px] w-full rounded-lg border border-border bg-surface-muted px-2.5 text-xs text-foreground outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                  />
                  {formErrors.plannedQuantity && (
                    <p className="mt-1 text-xs font-semibold text-danger">{formErrors.plannedQuantity}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="statusSelect" className="mb-1 block text-xs font-bold text-foreground">
                    Status
                  </label>
                  <select
                    id="statusSelect"
                    value={form.status}
                    onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as PlanStatus }))}
                    className="h-9 min-h-[36px] w-full rounded-lg border border-border bg-surface-muted px-2.5 text-xs text-foreground outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                  >
                    <option value="PLANNED">Planned</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="ON_HOLD">On Hold</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>
              </div>

              {/* Optional Notes */}
              <div>
                <label htmlFor="notesInput" className="mb-1 block text-xs font-bold text-foreground">
                  General Remarks / Notes
                </label>
                <textarea
                  id="notesInput"
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="Special instructions or notes for this shift plan..."
                  className="w-full rounded-lg border border-border bg-surface-muted p-2.5 text-xs text-foreground outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2.5 border-t border-border pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={saving}
                  className="rounded-lg border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-surface-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-5 py-2 text-xs font-bold text-white hover:bg-accent/90 disabled:opacity-50"
                >
                  {saving && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                  {editingPlan ? 'Update Plan' : 'Save Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-border bg-surface-raised p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-danger">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100">
                <AlertCircle className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Delete Production Plan</h3>
            </div>

            <p className="mt-3 text-sm text-muted">
              Are you sure you want to delete plan <span className="font-bold text-foreground">{deletingPlan.planNo}</span> for batch{' '}
              <span className="font-bold text-foreground">{deletingPlan.batchNo}</span>? This action cannot be undone.
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingPlan(null)}
                disabled={isDeleting}
                className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-surface-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="inline-flex items-center gap-2 rounded-xl bg-danger px-5 py-2 text-sm font-bold text-white hover:bg-danger/90 disabled:opacity-50"
              >
                {isDeleting && <RefreshCw className="h-4 w-4 animate-spin" />}
                Delete Plan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
