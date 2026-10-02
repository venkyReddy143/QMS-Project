import { Fragment, useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronRight, ChevronUp, PlusCircle, Trash2, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { fetchAdminMachinesApi } from '../lib/api/admin'
import {
  createBatchApi,
  fetchBatchesApi,
  activateBatchApi,
  updateBatchProcessStepsApi,
} from '../lib/api/batches'
import { fetchProductsApi, fetchProcessStepsApi } from '../lib/api/masters'
import type { AdminMachine } from '../types/admin'
import type { ProcessStepOption, ProductOption } from '../types/masters'
import type { OrderPriorityApi, ProductionBatch, ProductionOrder } from '../types/orders'

const fieldClass =
  'min-h-12 w-full rounded-xl border border-border bg-surface-muted px-3 text-base text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/20'

const labelClass = 'block text-sm font-bold text-foreground'

interface StepDraft {
  key: string
  processStepName: string
  hoursPerPiece: string
  machineIds: string[]
}

function draftKey(): string {
  return Math.random().toString(36).slice(2)
}

function todayIsoDate(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

function formatDate(value: string | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toISOString().slice(0, 10)
}

function nextBatchNo(batches: ProductionBatch[]): string {
  let max = 0
  for (const batch of batches) {
    const match = batch.batchNo.match(/(\d+)\s*$/)
    if (match) max = Math.max(max, Number(match[1]))
  }
  return `B${String(max + 1).padStart(2, '0')}`
}

function priorityLabel(value: string): string {
  if (value === 'CRITICAL' || value === 'URGENT') return 'Urgent'
  if (value === 'HIGH') return 'High'
  return 'Normal'
}

function serialStatusLabel(status: string): string {
  if (status === 'IN_PROGRESS') return 'In Progress'
  if (status === 'COMPLETED') return 'Completed'
  if (status === 'ON_HOLD') return 'On Hold'
  return 'Queued'
}

function serialStatusClass(status: string): string {
  if (status === 'COMPLETED') return 'bg-emerald-100 text-emerald-800'
  if (status === 'IN_PROGRESS') return 'bg-sky-100 text-sky-800'
  if (status === 'ON_HOLD') return 'bg-amber-100 text-amber-800'
  return 'bg-slate-100 text-slate-700'
}

function productionStatusLabel(status: string | undefined): string {
  if (!status) return 'Not Started'
  const normalized = status.trim().toLowerCase()
  if (normalized === 'not started') return 'Not Started'
  if (normalized === 'in progress') return 'In Progress'
  if (normalized === 'completed') return 'Completed'
  if (normalized === 'queue') return 'Queued'
  if (normalized === 'qc rejected') return 'QC Rejected'
  return status
}

function productionStatusClass(status: string | undefined): string {
  const normalized = (status ?? '').trim().toLowerCase()
  if (normalized === 'completed') return 'bg-emerald-100 text-emerald-800'
  if (normalized === 'in progress') return 'bg-sky-100 text-sky-800'
  if (normalized === 'queue') return 'bg-amber-100 text-amber-800'
  if (normalized === 'qc rejected') return 'bg-red-100 text-red-800'
  return 'bg-slate-100 text-slate-700'
}

function stepMachineLabel(batch: ProductionBatch, stepName: string): string {
  const match = (batch.processMachines ?? []).find(
    (item) => item.processStepName === stepName,
  )
  if (!match) return 'Unassigned'
  if (match.machines && match.machines.length > 0) {
    return match.machines
      .map((machine) => machine.machineCode || machine.machineName || '—')
      .join(', ')
  }
  const code = match.machineCode || ''
  const name = match.machineName || ''
  if (code && name) return `${code} — ${name}`
  return code || name || 'Unassigned'
}

function serialRange(batch: ProductionBatch): string {
  const serials = batch.serials ?? []
  if (serials.length === 0) return '—'
  const first = serials[0]?.serialNumber
  const last = serials[serials.length - 1]?.serialNumber
  if (!first) return '—'
  if (serials.length === 1 || first === last) return first
  return `${first} → ${last}`
}

export function OrderBatches({
  order,
  canEdit,
  initialExpandedBatchId,
  productFilterId,
}: {
  order: ProductionOrder
  canEdit: boolean
  initialExpandedBatchId?: string
  /** order line (_id) to show batches for; null/undefined shows all */
  productFilterId?: string | null
}) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const isSuperAdmin = user?.role === 'Super Admin'
  const products = order.products ?? []
  const [batches, setBatches] = useState<ProductionBatch[]>([])
  const [machines, setMachines] = useState<AdminMachine[]>([])
  const [productMasters, setProductMasters] = useState<ProductOption[]>([])
  const [processStepMasters, setProcessStepMasters] = useState<ProcessStepOption[]>([])
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [activatingId, setActivatingId] = useState<string | null>(null)
  const [expandedBatchId, setExpandedBatchId] = useState<string | null>(
    initialExpandedBatchId ?? null,
  )
  const [expandedStepKey, setExpandedStepKey] = useState<string | null>(null)

  const [productId, setProductId] = useState(products[0]?.productId ?? '')
  const [processStepName, setProcessStepName] = useState('')
  const [batchNo, setBatchNo] = useState('B01')
  const [quantity, setQuantity] = useState('')
  const [targetDate, setTargetDate] = useState(todayIsoDate())
  const [priority, setPriority] = useState<'Normal' | 'High' | 'Urgent'>('Normal')

  // Add Process Steps dialog (for an OPEN batch, before activation)
  const [stepsDialogBatch, setStepsDialogBatch] = useState<ProductionBatch | null>(null)
  const [stepsDraft, setStepsDraft] = useState<StepDraft[]>([])
  const [newStepId, setNewStepId] = useState('')
  const [newStepHours, setNewStepHours] = useState('0.50')
  const [customStepName, setCustomStepName] = useState('')
  const [customStepHours, setCustomStepHours] = useState('0.50')
  const [stepsError, setStepsError] = useState<string | null>(null)
  const [stepsSaving, setStepsSaving] = useState(false)
  const [machinePickerKey, setMachinePickerKey] = useState<string | null>(null)
  const [hoursEditKey, setHoursEditKey] = useState<string | null>(null)

  const filterProduct = productFilterId
    ? products.find((item) => (item.id || item.productId) === productFilterId)
    : undefined
  const visibleBatches = productFilterId
    ? batches.filter((batch) =>
        batch.orderLineId
          ? batch.orderLineId === productFilterId
          : batch.productId === filterProduct?.productId,
      )
    : batches

  const selectedProduct = products.find((item) => item.productId === productId)
  const steps = selectedProduct?.processSteps ?? []

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const batchRes = await fetchBatchesApi(order.id)
        if (!active) return
        const nextBatches = batchRes.batches ?? []
        setBatches(nextBatches)
        setBatchNo(nextBatchNo(nextBatches))
      } catch (loadError) {
        if (!active) return
        setError(
          loadError instanceof Error ? loadError.message : 'Failed to load batches.',
        )
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [order.id])

  useEffect(() => {
    if (!isSuperAdmin) return
    let active = true
    void fetchAdminMachinesApi()
      .then((response) => {
        if (!active) return
        setMachines(response.machines ?? [])
      })
      .catch(() => {
        if (!active) return
        setMachines([])
      })
    return () => {
      active = false
    }
  }, [isSuperAdmin])

  useEffect(() => {
    if (!isSuperAdmin) return
    let active = true
    void fetchProductsApi()
      .then((response) => {
        if (!active) return
        setProductMasters(response.products ?? [])
      })
      .catch(() => {
        if (!active) return
        setProductMasters([])
      })
    return () => {
      active = false
    }
  }, [isSuperAdmin])

  useEffect(() => {
    if (!isSuperAdmin) return
    let active = true
    void fetchProcessStepsApi()
      .then((response) => {
        if (!active) return
        setProcessStepMasters(response.processSteps ?? [])
      })
      .catch(() => {
        if (!active) return
        setProcessStepMasters([])
      })
    return () => {
      active = false
    }
  }, [isSuperAdmin])

  const remaining = useMemo(() => {
    if (!selectedProduct) return 0
    const allocated = batches
      .filter(
        (batch) =>
          batch.productId === selectedProduct.productId &&
          (batch.processStepName || '') === processStepName,
      )
      .reduce((sum, batch) => sum + batch.plannedQuantity, 0)
    return Math.max(0, selectedProduct.quantity - allocated)
  }, [batches, processStepName, selectedProduct])

  async function handleActivate(batchId: string) {
    setError(null)
    setMessage(null)
    setActivatingId(batchId)
    try {
      const response = await activateBatchApi(order.id, batchId)
      if (!response.success || !response.batch) {
        setError(response.message || 'Failed to activate batch.')
        return
      }
      setBatches((current) =>
        current.map((item) => (item.id === batchId ? response.batch! : item)),
      )
      setExpandedBatchId(batchId)
      setMessage(response.message)
    } catch (activateError) {
      setError(
        activateError instanceof Error
          ? activateError.message
          : 'Failed to activate batch.',
      )
    } finally {
      setActivatingId(null)
    }
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setMessage(null)
    const qty = Number(quantity)
    if (!productId) {
      setError('Select a product.')
      return
    }
    if (!batchNo.trim()) {
      setError('Batch number is required.')
      return
    }
    if (!Number.isInteger(qty) || qty < 1) {
      setError('Planned quantity must be a whole number of at least 1.')
      return
    }
    if (qty > remaining) {
      setError(
        remaining <= 0
          ? 'All quantity for this product / step is already in batches.'
          : `Only ${remaining} pcs remaining.`,
      )
      return
    }

    const priorityApi: OrderPriorityApi =
      priority === 'Urgent' ? 'URGENT' : priority === 'High' ? 'HIGH' : 'NORMAL'

    setSaving(true)
    try {
      const response = await createBatchApi(order.id, {
        orderLineId: selectedProduct?.id || undefined,
        productId,
        processStepName: processStepName || undefined,
        batchNo: batchNo.trim(),
        plannedQuantity: qty,
        targetDispatchDate: targetDate,
        priority: priorityApi,
      })
      if (!response.success || !response.batch) {
        setError(response.message || 'Failed to create batch.')
        return
      }
      const next = [...batches, response.batch]
      setBatches(next)
      setQuantity('')
      setBatchNo(nextBatchNo(next))
      setExpandedBatchId(response.batch.id)
      setMessage(
        response.message ||
          `Batch ${response.batch.batchNo} created with ${response.batch.serials?.length ?? qty} serial numbers.`,
      )
    } catch (createError) {
      setError(
        createError instanceof Error ? createError.message : 'Failed to create batch.',
      )
    } finally {
      setSaving(false)
    }
  }

  function openStepsDialog(batch: ProductionBatch) {
    setStepsError(null)
    setNewStepId('')
    setNewStepHours('0.50')
    setCustomStepName('')
    setCustomStepHours('0.50')
    setMachinePickerKey(null)
    setHoursEditKey(null)
    const fromBatch = (batch.processMachines ?? [])
      .slice()
      .sort((a, b) => a.sequence - b.sequence)
      .map((item) => ({
        key: draftKey(),
        processStepName: item.processStepName,
        hoursPerPiece: (item.hoursPerPiece ?? 0).toString(),
        machineIds:
          item.machines && item.machines.length > 0
            ? item.machines.map((m) => m.machineId)
            : item.machineId
              ? [item.machineId]
              : [],
      }))
    if (fromBatch.length > 0) {
      setStepsDraft(fromBatch)
    } else {
      // Prepopulate with default process steps so the user edits from a sensible
      // starting point instead of a blank list. Prefer the steps already planned
      // for this product on the order line; if none were planned yet, fall back to
      // the product's standard process route from Masters.
      const lineProduct =
        products.find((item) => item.productId === batch.productId) ??
        products.find((item) => item.productName === batch.productName)
      const lineSteps = lineProduct?.processSteps ?? []
      if (lineSteps.length > 0) {
        setStepsDraft(
          lineSteps.map((item) => ({
            key: draftKey(),
            processStepName: item.name,
            hoursPerPiece: (item.hoursPerPiece ?? 0.5).toString(),
            machineIds: item.machineId ? [item.machineId] : [],
          })),
        )
      } else {
        const masterProduct =
          productMasters.find((item) => item.id === batch.productId) ??
          productMasters.find((item) => item.name === batch.productName)
        const routeSteps = (masterProduct?.processSteps ?? [])
          .slice()
          .sort((a, b) => a.sequence - b.sequence)
        setStepsDraft(
          routeSteps.map((item) => ({
            key: draftKey(),
            processStepName: item.name,
            hoursPerPiece: (item.hoursPerPiece ?? 0.5).toString(),
            machineIds: [],
          })),
        )
      }
    }
    setStepsDialogBatch(batch)
  }

  function closeStepsDialog() {
    setStepsDialogBatch(null)
    setStepsDraft([])
    setStepsError(null)
    setNewStepId('')
    setNewStepHours('0.50')
    setCustomStepName('')
    setCustomStepHours('0.50')
    setMachinePickerKey(null)
    setHoursEditKey(null)
  }

  function addStepFromMaster() {
    const master = processStepMasters.find((item) => item.id === newStepId)
    if (!master) return
    if (
      stepsDraft.some(
        (item) => item.processStepName.toLowerCase() === master.name.toLowerCase(),
      )
    ) {
      setStepsError(`Step "${master.name}" is already in this batch.`)
      return
    }
    setStepsError(null)
    setStepsDraft((current) => [
      ...current,
      {
        key: draftKey(),
        processStepName: master.name,
        hoursPerPiece: newStepHours || String(master.standardHoursPerPiece),
        machineIds: [],
      },
    ])
    setNewStepId('')
    setNewStepHours('0.50')
  }

  function addCustomStep() {
    const name = customStepName.trim()
    if (!name) return
    if (stepsDraft.some((item) => item.processStepName.toLowerCase() === name.toLowerCase())) {
      setStepsError(`Step "${name}" is already in this batch.`)
      return
    }
    setStepsError(null)
    setStepsDraft((current) => [
      ...current,
      { key: draftKey(), processStepName: name, hoursPerPiece: customStepHours || '0.50', machineIds: [] },
    ])
    setCustomStepName('')
    setCustomStepHours('0.50')
  }

  function removeDraftStep(key: string) {
    setStepsDraft((current) => current.filter((item) => item.key !== key))
  }

  function moveDraftStep(key: string, direction: 'up' | 'down') {
    setStepsDraft((current) => {
      const index = current.findIndex((item) => item.key === key)
      if (index === -1) return current
      const targetIndex = direction === 'up' ? index - 1 : index + 1
      if (targetIndex < 0 || targetIndex >= current.length) return current
      const next = current.slice()
      const [moved] = next.splice(index, 1)
      next.splice(targetIndex, 0, moved)
      return next
    })
  }

  function addDraftMachine(key: string, machineId: string) {
    if (!machineId) return
    setStepsDraft((current) =>
      current.map((item) =>
        item.key === key && !item.machineIds.includes(machineId)
          ? { ...item, machineIds: [...item.machineIds, machineId] }
          : item,
      ),
    )
  }

  function removeDraftMachine(key: string, machineId: string) {
    setStepsDraft((current) =>
      current.map((item) =>
        item.key === key
          ? { ...item, machineIds: item.machineIds.filter((id) => id !== machineId) }
          : item,
      ),
    )
  }

  function updateDraftHours(key: string, hoursPerPiece: string) {
    setStepsDraft((current) =>
      current.map((item) => (item.key === key ? { ...item, hoursPerPiece } : item)),
    )
  }

  async function saveSteps() {
    if (!stepsDialogBatch) return
    if (stepsDraft.length === 0) {
      setStepsError('Add at least one process step.')
      return
    }
    setStepsError(null)
    setStepsSaving(true)
    try {
      const response = await updateBatchProcessStepsApi(order.id, stepsDialogBatch.id, {
        steps: stepsDraft.map((item, index) => ({
          processStepName: item.processStepName,
          sequence: index + 1,
          hoursPerPiece: Number(item.hoursPerPiece) || 0,
          machineIds: item.machineIds.length > 0 ? item.machineIds : undefined,
        })),
      })
      if (!response.success || !response.batch) {
        setStepsError(response.message || 'Failed to save process steps.')
        return
      }
      setBatches((current) =>
        current.map((item) => (item.id === stepsDialogBatch.id ? response.batch! : item)),
      )
      setMessage(response.message || 'Process steps saved.')
      closeStepsDialog()
    } catch (saveError) {
      setStepsError(
        saveError instanceof Error ? saveError.message : 'Failed to save process steps.',
      )
    } finally {
      setStepsSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {canEdit && isSuperAdmin ? (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() =>
              navigate(`/orders/${order.id}/create-batch`, {
                state: { orderLineId: productFilterId ?? undefined },
              })
            }
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-bold text-white hover:brightness-110"
          >
            <PlusCircle className="h-4 w-4" />
            Create Batch
          </button>
        </div>
      ) : null}
      {canEdit && !isSuperAdmin ? (
        <section className="rounded-2xl border border-border bg-surface-raised p-5">
          <h3 className="mb-1 text-lg font-bold">Create Batch</h3>
          <p className="mb-4 text-sm text-muted">
            Serial numbers are generated for the planned quantity so employees can take
            them up and update status later.
          </p>
          <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1.5">
              <span className={labelClass}>Product</span>
              <select
                value={productId}
                onChange={(event) => {
                  setProductId(event.target.value)
                  setProcessStepName('')
                }}
                className={fieldClass}
              >
                {products.map((item) => (
                  <option key={item.productId} value={item.productId}>
                    {item.productName} ({item.quantity})
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1.5">
              <span className={labelClass}>Process Step</span>
              <select
                value={processStepName}
                onChange={(event) => setProcessStepName(event.target.value)}
                className={fieldClass}
              >
                <option value="">Whole product</option>
                {steps.map((step) => (
                  <option key={step.name} value={step.name}>
                    {step.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1.5">
              <span className={labelClass}>Batch No</span>
              <input
                value={batchNo}
                onChange={(event) => setBatchNo(event.target.value)}
                className={fieldClass}
              />
            </label>
            <label className="block space-y-1.5">
              <span className={labelClass}>Planned Quantity</span>
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                className={fieldClass}
              />
              <p className="text-sm text-muted">{remaining} pcs remaining</p>
            </label>
            <label className="block space-y-1.5">
              <span className={labelClass}>Target Dispatch Date</span>
              <input
                type="date"
                value={targetDate}
                onChange={(event) => setTargetDate(event.target.value)}
                className={fieldClass}
              />
            </label>
            <label className="block space-y-1.5">
              <span className={labelClass}>Priority</span>
              <select
                value={priority}
                onChange={(event) =>
                  setPriority(event.target.value as 'Normal' | 'High' | 'Urgent')
                }
                className={fieldClass}
              >
                <option value="Normal">Normal</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </label>
            <div className="sm:col-span-2 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="min-h-12 rounded-xl bg-accent px-8 text-base font-bold text-white disabled:opacity-70"
              >
                {saving ? 'Saving…' : 'Create Batch'}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-danger/30 bg-red-50 px-4 py-3 text-sm font-medium text-danger">
          {error}
        </div>
      ) : null}
      {message ? (
        <div className="rounded-xl border border-accent/30 bg-accent-soft px-4 py-3 text-sm font-semibold text-accent">
          {message}
        </div>
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-border bg-surface-raised">
        <div className="border-b border-border px-5 py-4">
          <h3 className="text-lg font-bold">Batches</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-surface-muted text-xs font-bold uppercase tracking-wide text-muted">
              <tr>
                <th className="w-10 px-3 py-3">
                  <span className="sr-only">Expand</span>
                </th>
                <th className="px-4 py-3">Batch No</th>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Process Step</th>
                <th className="px-4 py-3">Total Qty</th>
                {isSuperAdmin ? <th className="px-4 py-3">Status</th> : null}
                <th className="px-4 py-3">Serials</th>
                <th className="px-4 py-3">Dispatch Date</th>
                <th className="px-4 py-3">Priority</th>
                {isSuperAdmin ? <th className="px-4 py-3">Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {visibleBatches.length === 0 ? (
                <tr>
                  <td colSpan={isSuperAdmin ? 10 : 8} className="px-4 py-8 text-center text-muted">
                    No batches yet.
                  </td>
                </tr>
              ) : (
                visibleBatches.map((batch) => {
                  const serials = batch.serials ?? []
                  const expanded = expandedBatchId === batch.id
                  // every batch can be expanded; its details stay hidden until then
                  const canExpand = isSuperAdmin || serials.length > 0
                  return (
                    <Fragment key={batch.id}>
                      <tr
                        className={`border-t border-border ${
                          canExpand ? 'cursor-pointer hover:bg-surface-muted/60' : ''
                        }`}
                        onClick={() => {
                          if (!canExpand) return
                          setExpandedBatchId(expanded ? null : batch.id)
                        }}
                      >
                        <td className="px-3 py-3">
                          {canExpand ? (
                            <button
                              type="button"
                              aria-expanded={expanded}
                              aria-label={
                                expanded
                                  ? `Hide details for ${batch.batchNo}`
                                  : `View details for ${batch.batchNo}`
                              }
                              onClick={(event) => {
                                event.stopPropagation()
                                setExpandedBatchId(expanded ? null : batch.id)
                              }}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-surface-muted hover:text-foreground"
                            >
                              {expanded ? (
                                <ChevronDown className="h-5 w-5" aria-hidden />
                              ) : (
                                <ChevronRight className="h-5 w-5" aria-hidden />
                              )}
                            </button>
                          ) : (
                            <span className="inline-block h-8 w-8" />
                          )}
                        </td>
                        <td className="px-4 py-3 font-bold text-accent">
                          {batch.batchNo}
                        </td>
                        <td className="px-4 py-3">{batch.productName || '—'}</td>
                        <td className="px-4 py-3">
                          {batch.processStepName || 'Whole product'}
                        </td>
                        <td className="px-4 py-3">
                          {batch.totalBatchQty ?? batch.plannedQuantity}
                        </td>
                        {isSuperAdmin ? (
                          <td className="px-4 py-3">{batch.status}</td>
                        ) : null}
                        <td className="px-4 py-3">
                          {serials.length === 0 ? (
                            batch.status === 'OPEN' ? (
                              <span className="text-muted">Pending activate</span>
                            ) : (
                              '—'
                            )
                          ) : (
                            <span className="font-semibold text-accent">
                              {serials.length} pcs
                              <span className="mt-0.5 block font-mono text-xs font-medium text-muted">
                                {serialRange(batch)}
                              </span>
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {formatDate(batch.targetDispatchDate)}
                        </td>
                        <td className="px-4 py-3">{priorityLabel(batch.priority)}</td>
                        {isSuperAdmin ? (
                          <td className="px-4 py-3">
                            {batch.status === 'OPEN' ? (
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation()
                                    openStepsDialog(batch)
                                  }}
                                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:border-accent"
                                >
                                  Process Steps
                                </button>
                                <button
                                  type="button"
                                  disabled={activatingId === batch.id}
                                  onClick={(event) => {
                                    event.stopPropagation()
                                    void handleActivate(batch.id)
                                  }}
                                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:border-accent disabled:opacity-60"
                                >
                                  {activatingId === batch.id ? 'Activating…' : 'Activate'}
                                </button>
                              </div>
                            ) : (
                              '—'
                            )}
                          </td>
                        ) : null}
                      </tr>
                      {isSuperAdmin && expanded ? (
                        <tr className="border-t border-border bg-surface-muted/30">
                          <td colSpan={10} className="px-4 py-3 text-sm">
                            <p className="font-bold">
                              {batch.batchNo} — {batch.processQtys?.total ?? batch.plannedQuantity} qty
                              {batch.productionInCharge
                                ? ` · In charge: ${batch.productionInCharge}`
                                : ''}
                            </p>
                            <p className="mt-1 text-muted">
                              Not started:{' '}
                              {batch.processQtys?.notStarted ?? 0} · QC rejected:{' '}
                              {batch.processQtys?.qcRejected ?? 0} · Full ready:{' '}
                              {batch.processQtys?.fullReady ?? 0}
                            </p>
                            <div className="mt-2 overflow-x-auto">
                              <table className="min-w-full text-left text-xs">
                                <thead>
                                  <tr className="uppercase text-muted">
                                    <th className="py-1 pr-3">Process Step</th>
                                    <th className="py-1 pr-3">Seq</th>
                                    <th className="py-1 pr-3">Status</th>
                                    <th className="py-1 pr-3">Queue</th>
                                    <th className="py-1 pr-3">In Progress</th>
                                    <th className="py-1 pr-3">QC Rejected</th>
                                    <th className="py-1">Completed</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(batch.processQtys?.steps ?? []).map((step) => {
                                    const stepKey = `${batch.id}::${step.name}`
                                    const stepExpanded = expandedStepKey === stepKey
                                    return (
                                      <Fragment key={step.name}>
                                        <tr
                                          className="cursor-pointer hover:bg-surface-raised"
                                          role="button"
                                          tabIndex={0}
                                          aria-expanded={stepExpanded}
                                          aria-label={`View assigned machine and production status for ${step.name}`}
                                          onClick={() =>
                                            setExpandedStepKey((current) =>
                                              current === stepKey ? null : stepKey,
                                            )
                                          }
                                          onKeyDown={(event) => {
                                            if (event.key === 'Enter' || event.key === ' ') {
                                              event.preventDefault()
                                              setExpandedStepKey((current) =>
                                                current === stepKey ? null : stepKey,
                                              )
                                            }
                                          }}
                                        >
                                          <td className="py-1 pr-3 font-semibold text-accent underline-offset-2 hover:underline">
                                            {step.name}
                                          </td>
                                          <td className="py-1 pr-3">{step.sequence ?? '—'}</td>
                                          <td className="py-1 pr-3">{step.status ?? '—'}</td>
                                          <td className="py-1 pr-3">{step.queue}</td>
                                          <td className="py-1 pr-3">{step.inProgress}</td>
                                          <td className="py-1 pr-3">{step.qcRejected ?? 0}</td>
                                          <td className="py-1">{step.completed ?? 0}</td>
                                        </tr>
                                        {stepExpanded ? (
                                          <tr className="bg-surface-raised">
                                            <td colSpan={7} className="px-1 py-2">
                                              <div className="rounded-lg border border-border bg-surface-muted p-2.5">
                                                <p className="font-bold text-foreground">
                                                  {step.name}
                                                </p>
                                                <dl className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1">
                                                  <dt className="text-muted">Assigned Machine</dt>
                                                  <dd className="font-semibold text-foreground">
                                                    {stepMachineLabel(batch, step.name)}
                                                  </dd>
                                                  <dt className="text-muted">Production Status</dt>
                                                  <dd>
                                                    <span
                                                      className={`rounded-full px-2 py-0.5 text-xs font-bold ${productionStatusClass(step.status)}`}
                                                    >
                                                      {productionStatusLabel(step.status)}
                                                    </span>
                                                  </dd>
                                                </dl>
                                              </div>
                                            </td>
                                          </tr>
                                        ) : null}
                                      </Fragment>
                                    )
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                      {expanded && serials.length > 0 ? (
                        <tr className="border-t border-border bg-surface-muted/50">
                          <td colSpan={isSuperAdmin ? 10 : 8} className="px-4 py-3">
                            <div className="max-h-72 overflow-auto rounded-xl border border-border bg-surface-raised">
                              <table className="min-w-full text-left text-sm">
                                <thead className="bg-surface-muted text-xs font-bold uppercase tracking-wide text-muted">
                                  <tr>
                                    <th className="px-3 py-2">#</th>
                                    <th className="px-3 py-2">Serial Number</th>
                                    <th className="px-3 py-2">Status</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {serials.map((serial) => (
                                    <tr
                                      key={serial.serialNumber}
                                      className="border-t border-border"
                                    >
                                      <td className="px-3 py-2 text-muted">
                                        {serial.sequence}
                                      </td>
                                      <td className="px-3 py-2 font-mono font-semibold">
                                        {serial.serialNumber}
                                      </td>
                                      <td className="px-3 py-2">
                                        <span
                                          className={`rounded-full px-2 py-0.5 text-xs font-bold ${serialStatusClass(serial.status)}`}
                                        >
                                          {serialStatusLabel(serial.status)}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {stepsDialogBatch ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-4 sm:items-center"
          onClick={closeStepsDialog}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="batch-steps-title"
            className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-2xl border border-border bg-surface-raised p-5 shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 id="batch-steps-title" className="text-lg font-bold text-foreground">
                  Process Steps — {stepsDialogBatch.batchNo}
                </h3>
                <p className="text-sm text-muted">
                  Default process steps for this product are pre-filled below. Add or remove
                  steps and allocate one or more machines to each step before activating the
                  batch.
                </p>
              </div>
              <button
                type="button"
                onClick={closeStepsDialog}
                className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-xl border border-border text-muted hover:text-foreground"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="hidden items-center gap-3 px-3 pb-1 text-xs font-bold uppercase tracking-wide text-muted sm:flex">
              <span className="w-7 shrink-0" />
              <span className="min-w-[9rem] flex-1">Process Steps</span>
              <span className="min-w-[11rem] flex-1">Allocate Machines</span>
              <span className="w-10 shrink-0" />
            </div>

            <ol className="space-y-2">
              {stepsDraft.length === 0 ? (
                <li className="rounded-xl bg-surface-muted px-3 py-3 text-sm text-muted">
                  No process steps yet. Add at least one below.
                </li>
              ) : (
                stepsDraft.map((item, index) => {
                  const pickerOpen = machinePickerKey === item.key
                  const hoursEditing = hoursEditKey === item.key
                  return (
                    <li
                      key={item.key}
                      className="flex min-h-12 flex-wrap items-center gap-3 rounded-xl border border-border bg-surface-muted px-3 py-2"
                    >
                      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-white">
                        {index + 1}
                      </span>
                      <div className="min-w-[9rem] flex-1">
                        <p className="font-semibold text-foreground">{item.processStepName}</p>
                        {hoursEditing ? (
                          <div className="mt-0.5 flex items-center gap-1">
                            <input
                              type="number"
                              min={0}
                              step={0.05}
                              autoFocus
                              value={item.hoursPerPiece}
                              onChange={(event) => updateDraftHours(item.key, event.target.value)}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter') setHoursEditKey(null)
                              }}
                              className="h-7 w-20 rounded-lg border border-border bg-surface-raised px-2 text-sm outline-none focus:border-accent"
                            />
                            <span className="text-xs text-muted">h/pc</span>
                            <button
                              type="button"
                              onClick={() => setHoursEditKey(null)}
                              className="text-xs font-semibold text-accent hover:underline"
                            >
                              Done
                            </button>
                          </div>
                        ) : (
                          <p className="flex items-center gap-1.5 text-sm text-muted">
                            {(Number(item.hoursPerPiece) || 0).toFixed(2)}h / pc
                            <button
                              type="button"
                              onClick={() => setHoursEditKey(item.key)}
                              className="text-xs font-semibold text-accent hover:underline"
                              aria-label={`Edit hours for ${item.processStepName}`}
                            >
                              Edit
                            </button>
                          </p>
                        )}
                      </div>
                      <div className="flex min-w-[11rem] flex-1 flex-wrap items-center gap-2">
                      {item.machineIds.map((machineId) => {
                        const machine = machines.find((m) => m.id === machineId)
                        const label = machine
                          ? `${machine.machineCode} — ${machine.name}`
                          : machineId
                        return (
                          <span
                            key={machineId}
                            className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent"
                          >
                            {label}
                            <button
                              type="button"
                              onClick={() => removeDraftMachine(item.key, machineId)}
                              className="text-accent hover:text-danger"
                              aria-label={`Remove ${label}`}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        )
                      })}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() =>
                            setMachinePickerKey((current) => (current === item.key ? null : item.key))
                          }
                          aria-haspopup="listbox"
                          aria-expanded={pickerOpen}
                          className="min-h-10 min-w-[10rem] rounded-lg border border-border bg-surface-raised px-3 text-sm outline-none focus:border-accent"
                        >
                          Select Machine
                        </button>
                        {pickerOpen ? (
                          <div className="absolute right-0 z-10 mt-1 max-h-64 w-72 overflow-auto rounded-xl border border-border bg-surface-raised p-2 shadow-lg">
                            {machines.length === 0 ? (
                              <p className="px-2 py-1.5 text-sm text-muted">
                                No machines available.
                              </p>
                            ) : (
                              machines.map((machine) => {
                                const checked = item.machineIds.includes(machine.id)
                                return (
                                  <label
                                    key={machine.id}
                                    className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-surface-muted"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() =>
                                        checked
                                          ? removeDraftMachine(item.key, machine.id)
                                          : addDraftMachine(item.key, machine.id)
                                      }
                                      className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
                                    />
                                    <span>
                                      {machine.machineCode} — {machine.name}
                                    </span>
                                  </label>
                                )
                              })
                            )}
                            <div className="mt-1 flex justify-end border-t border-border pt-1">
                              <button
                                type="button"
                                onClick={() => setMachinePickerKey(null)}
                                className="rounded-lg px-3 py-1 text-xs font-bold text-accent hover:bg-accent-soft"
                              >
                                Done
                              </button>
                            </div>
                          </div>
                        ) : null}
                      </div>
                      </div>
                      <div className="flex shrink-0 flex-col gap-0.5">
                        <button
                          type="button"
                          onClick={() => moveDraftStep(item.key, 'up')}
                          disabled={index === 0}
                          className="inline-flex h-5 w-8 items-center justify-center rounded-md border border-border bg-surface-raised text-muted hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label={`Move ${item.processStepName || 'step'} up`}
                        >
                          <ChevronUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveDraftStep(item.key, 'down')}
                          disabled={index === stepsDraft.length - 1}
                          className="inline-flex h-5 w-8 items-center justify-center rounded-md border border-border bg-surface-raised text-muted hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label={`Move ${item.processStepName || 'step'} down`}
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeDraftStep(item.key)}
                        className="inline-flex min-h-10 min-w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-raised text-muted hover:border-danger hover:text-danger"
                        aria-label={`Remove ${item.processStepName || 'step'}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  )
                })
              )}
            </ol>

            <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_120px_auto]">
              <select
                value={newStepId}
                onChange={(event) => {
                  const id = event.target.value
                  const master = processStepMasters.find((item) => item.id === id)
                  setNewStepId(id)
                  setNewStepHours(master ? String(master.standardHoursPerPiece) : '0.50')
                }}
                className={fieldClass}
              >
                <option value="">Select a process step</option>
                {processStepMasters
                  .filter(
                    (master) =>
                      !stepsDraft.some(
                        (item) =>
                          item.processStepName.toLowerCase() === master.name.toLowerCase(),
                      ),
                  )
                  .map((master) => (
                    <option key={master.id} value={master.id}>
                      {master.name}
                    </option>
                  ))}
              </select>
              <input
                type="number"
                min={0}
                step="any"
                value={newStepHours}
                onChange={(event) => setNewStepHours(event.target.value)}
                className={fieldClass}
              />
              <button
                type="button"
                onClick={addStepFromMaster}
                disabled={!newStepId}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-foreground px-4 text-sm font-bold text-white disabled:opacity-60"
              >
                <PlusCircle className="h-4 w-4" />
                Add
              </button>
            </div>

            <div className="mt-3 rounded-xl border border-dashed border-border bg-surface-muted/50 p-3">
              <p className="mb-2 text-sm font-bold text-foreground">Custom process step</p>
              <div className="grid gap-3 sm:grid-cols-[1fr_120px_auto]">
                <input
                  value={customStepName}
                  onChange={(event) => setCustomStepName(event.target.value)}
                  placeholder="Step name"
                  className={fieldClass}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      addCustomStep()
                    }
                  }}
                />
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={customStepHours}
                  onChange={(event) => setCustomStepHours(event.target.value)}
                  className={fieldClass}
                />
                <button
                  type="button"
                  onClick={addCustomStep}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border bg-surface-raised px-4 text-sm font-bold text-foreground hover:border-accent hover:text-accent"
                >
                  <PlusCircle className="h-4 w-4" />
                  Add
                </button>
              </div>
            </div>

            {stepsError ? (
              <p className="mt-3 text-sm font-medium text-danger">{stepsError}</p>
            ) : null}

            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeStepsDialog}
                className="min-h-12 rounded-xl border border-border px-6 text-base font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={stepsSaving}
                onClick={() => void saveSteps()}
                className="min-h-12 rounded-xl bg-accent px-8 text-base font-bold text-white hover:brightness-110 disabled:opacity-70"
              >
                {stepsSaving ? 'Saving…' : 'Save Process Steps'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
