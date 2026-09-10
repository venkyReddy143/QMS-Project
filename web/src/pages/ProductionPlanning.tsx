import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  assignSerialsApi,
  fetchAllBatchesApi,
  fetchEmployeesApi,
  updateBatchSerialsApi,
} from '../lib/api/batches'
import { fetchMachinesApi } from '../lib/api/masters'
import type {
  EmployeeOption,
  ProductionBatch,
} from '../types/orders'
import type { MachineOption } from '../types/masters'

const SHIFTS = ['A', 'B', 'C'] as const

export function ProductionPlanning() {
  const { user } = useAuth()
  const isSuperAdmin = user?.role === 'Super Admin'
  const [batches, setBatches] = useState<ProductionBatch[]>([])
  const [employees, setEmployees] = useState<EmployeeOption[]>([])
  const [machines, setMachines] = useState<MachineOption[]>([])
  const [batchId, setBatchId] = useState('')
  const [shift, setShift] = useState<(typeof SHIFTS)[number]>('A')
  const [machineId, setMachineId] = useState('')
  const [operatorId, setOperatorId] = useState('')
  const [processStepName, setProcessStepName] = useState('')
  const [selectedSerials, setSelectedSerials] = useState<string[]>([])
  const [status, setStatus] = useState('IN_PROGRESS')
  const [completedPercent, setCompletedPercent] = useState('50')
  const [comments, setComments] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  async function reload() {
    const [batchRes, peopleRes, machineRes] = await Promise.all([
      fetchAllBatchesApi(),
      fetchEmployeesApi(),
      fetchMachinesApi(),
    ])
    const nextBatches = (batchRes.batches ?? []).filter(
      (batch) => batch.status === 'ACTIVE' || (batch.serials?.length ?? 0) > 0,
    )
    setBatches(nextBatches)
    setEmployees(peopleRes.employees ?? [])
    setMachines(machineRes.machines ?? [])
    if (!batchId && nextBatches[0]) setBatchId(nextBatches[0].id)
    if (!operatorId && peopleRes.employees?.[0]) {
      setOperatorId(peopleRes.employees[0].id)
    }
    if (!machineId && machineRes.machines?.[0]) {
      setMachineId(machineRes.machines[0].id)
    }
  }

  useEffect(() => {
    void reload()
      .catch((loadError: unknown) =>
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Failed to load planning data.',
        ),
      )
      .finally(() => setLoading(false))
  }, [])

  const selectedBatch = batches.find((batch) => batch.id === batchId)
  const processOptions = useMemo(() => {
    if (!selectedBatch) return []
    if ((selectedBatch.processStepNames ?? []).length > 0) {
      return selectedBatch.processStepNames ?? []
    }
    return (selectedBatch.processMachines ?? []).map((item) => item.processStepName)
  }, [selectedBatch])

  const visibleSerials = useMemo(() => {
    const serials = selectedBatch?.serials ?? []
    return serials.filter(
      (serial) =>
        serial.status === 'QUEUED' ||
        serial.status === 'IN_PROGRESS' ||
        serial.status === 'ON_HOLD',
    )
  }, [selectedBatch])

  useEffect(() => {
    if (!processStepName && processOptions[0]) {
      setProcessStepName(processOptions[0])
    }
  }, [processOptions, processStepName])

  function toggleSerial(serialNumber: string) {
    setSelectedSerials((current) =>
      current.includes(serialNumber)
        ? current.filter((item) => item !== serialNumber)
        : [...current, serialNumber],
    )
  }

  async function handleAssign() {
    if (!selectedBatch) return
    if (selectedSerials.length === 0) {
      setError('Select at least one serial.')
      return
    }
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      const response = await assignSerialsApi(selectedBatch.orderId, selectedBatch.id, {
        serialNumbers: selectedSerials,
        shift,
        machineId: machineId || undefined,
        operatorId: operatorId || undefined,
        processStepName: processStepName || undefined,
      })
      if (!response.success) {
        setError(response.message || 'Assign failed.')
        return
      }
      setMessage(response.message)
      await reload()
    } catch (assignError) {
      setError(
        assignError instanceof Error ? assignError.message : 'Assign failed.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleUpdate() {
    if (!selectedBatch) return
    if (selectedSerials.length === 0) {
      setError('Select at least one Queued / In Progress serial.')
      return
    }
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      const percent = Number(completedPercent)
      const response = await updateBatchSerialsApi(
        selectedBatch.orderId,
        selectedBatch.id,
        {
          operatorId: operatorId || user?.id,
          shift,
          machineId: machineId || undefined,
          updates: selectedSerials.map((serialNumber) => ({
            serialNumber,
            status,
            completedPercent: Number.isFinite(percent) ? percent : 0,
            comments: comments.trim(),
            currentProcessStepName: processStepName || undefined,
          })),
        },
      )
      if (!response.success) {
        setError(response.message || 'Update failed.')
        return
      }
      setMessage(response.message)
      setSelectedSerials([])
      setComments('')
      await reload()
    } catch (updateError) {
      setError(
        updateError instanceof Error ? updateError.message : 'Update failed.',
      )
    } finally {
      setSaving(false)
    }
  }

  const fieldClass =
    'min-h-11 w-full rounded-xl border border-border bg-surface-muted px-3 text-sm outline-none focus:border-accent'
  const labelClass = 'block text-sm font-bold text-foreground'

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-border bg-surface-raised p-5">
        <h2 className="text-2xl font-bold text-foreground">
          {isSuperAdmin ? 'Production Planning' : 'Shift Work Update'}
        </h2>
        <p className="mt-1 text-base text-muted">
          Plan batch work by shift, machine, process, and operator. Operators update
          Queued / In Progress records (including completed %).
        </p>
      </section>

      {loading ? <p className="text-muted">Loading…</p> : null}
      {error ? (
        <div className="rounded-xl border border-danger/30 bg-red-50 px-4 py-3 text-sm text-danger">
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
          <h3 className="text-lg font-bold">Planning Grid</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-surface-muted text-xs font-bold uppercase text-muted">
              <tr>
                <th className="px-4 py-3">Prod Batch</th>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Shift</th>
                <th className="px-4 py-3">Machine</th>
                <th className="px-4 py-3">Process</th>
                <th className="px-4 py-3">Operator</th>
              </tr>
            </thead>
            <tbody>
              {batches.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted">
                    No active batches with serials yet. Create and activate a batch first.
                  </td>
                </tr>
              ) : (
                batches.map((batch) => {
                  const assignment = batch.assignments[0]
                  const machine =
                    batch.assignedMachines?.[0]?.machineCode ||
                    batch.serials.find((item) => item.machineCode)?.machineCode ||
                    '—'
                  const process =
                    batch.processStepNames?.[0] ||
                    batch.processStepName ||
                    '—'
                  return (
                    <tr
                      key={batch.id}
                      className={`border-t border-border cursor-pointer ${
                        batchId === batch.id ? 'bg-accent-soft/40' : ''
                      }`}
                      onClick={() => {
                        setBatchId(batch.id)
                        setSelectedSerials([])
                      }}
                    >
                      <td className="px-4 py-3 font-semibold">{batch.batchNo}</td>
                      <td className="px-4 py-3">{batch.productName || '—'}</td>
                      <td className="px-4 py-3">
                        {batch.targetDispatchDate
                          ? String(batch.targetDispatchDate).slice(0, 10)
                          : '—'}
                      </td>
                      <td className="px-4 py-3">{assignment?.shift || '—'}</td>
                      <td className="px-4 py-3">{machine}</td>
                      <td className="px-4 py-3">{process}</td>
                      <td className="px-4 py-3">
                        {assignment?.employeeName ||
                          batch.productionInCharge ||
                          '—'}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {selectedBatch ? (
        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-border bg-surface-raised p-5 space-y-3">
            <h3 className="text-lg font-bold">
              Supervisor assign — {selectedBatch.batchNo}
            </h3>
            <label className="block space-y-1.5">
              <span className={labelClass}>Shift</span>
              <select
                value={shift}
                onChange={(event) =>
                  setShift(event.target.value as (typeof SHIFTS)[number])
                }
                className={fieldClass}
              >
                {SHIFTS.map((item) => (
                  <option key={item} value={item}>
                    Shift {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1.5">
              <span className={labelClass}>Machine</span>
              <select
                value={machineId}
                onChange={(event) => setMachineId(event.target.value)}
                className={fieldClass}
              >
                {machines.map((machine) => (
                  <option key={machine.id} value={machine.id}>
                    {machine.machineCode} — {machine.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1.5">
              <span className={labelClass}>Process</span>
              <select
                value={processStepName}
                onChange={(event) => setProcessStepName(event.target.value)}
                className={fieldClass}
              >
                {processOptions.length === 0 ? (
                  <option value="">Whole product</option>
                ) : (
                  processOptions.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))
                )}
              </select>
            </label>
            <label className="block space-y-1.5">
              <span className={labelClass}>Operator</span>
              <select
                value={operatorId}
                onChange={(event) => setOperatorId(event.target.value)}
                className={fieldClass}
              >
                {employees.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name} ({person.employeeCode})
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleAssign()}
              className="min-h-11 rounded-xl bg-accent px-4 text-sm font-bold text-white disabled:opacity-70"
            >
              Assign selected to machine & shift
            </button>
          </div>

          <div className="rounded-2xl border border-border bg-surface-raised p-5 space-y-3">
            <h3 className="text-lg font-bold">Operator update</h3>
            <p className="text-sm text-muted">
              Only Queued / In Progress records are listed. Update multiple at once.
            </p>
            <label className="block space-y-1.5">
              <span className={labelClass}>Status</span>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className={fieldClass}
              >
                <option value="IN_PROGRESS">In progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="QC_REJECTED">QC rejected</option>
                <option value="FULL_READY">Full ready</option>
                <option value="ON_HOLD">On hold</option>
              </select>
            </label>
            <label className="block space-y-1.5">
              <span className={labelClass}>Completed %</span>
              <input
                type="number"
                min={0}
                max={100}
                value={completedPercent}
                onChange={(event) => setCompletedPercent(event.target.value)}
                className={fieldClass}
              />
            </label>
            <label className="block space-y-1.5">
              <span className={labelClass}>Comments / shift handover note</span>
              <textarea
                value={comments}
                onChange={(event) => setComments(event.target.value)}
                className={`${fieldClass} min-h-20 py-2`}
                placeholder="Accept/query previous shift status, handover notes…"
              />
            </label>
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleUpdate()}
              className="min-h-11 rounded-xl bg-accent px-4 text-sm font-bold text-white disabled:opacity-70"
            >
              Update selected records
            </button>
            <p className="text-xs text-muted">
              Hours are derived from completed % × process hours/piece and saved to
              the batch time log. Use comments to accept or query previous shift
              status at handover.
            </p>
          </div>
        </section>
      ) : null}

      {selectedBatch ? (
        <section className="overflow-hidden rounded-2xl border border-border bg-surface-raised">
          <div className="border-b border-border px-5 py-4 flex items-center justify-between">
            <h3 className="text-lg font-bold">
              Serials — {selectedBatch.batchNo}
            </h3>
            <button
              type="button"
              onClick={() =>
                setSelectedSerials(visibleSerials.map((item) => item.serialNumber))
              }
              className="text-sm font-bold text-accent"
            >
              Select all visible
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-surface-muted text-xs font-bold uppercase text-muted">
                <tr>
                  <th className="px-4 py-3">Select</th>
                  <th className="px-4 py-3">Serial</th>
                  <th className="px-4 py-3">Process</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">%</th>
                  <th className="px-4 py-3">Shift</th>
                  <th className="px-4 py-3">Operator</th>
                  <th className="px-4 py-3">Prev. notes</th>
                </tr>
              </thead>
              <tbody>
                {visibleSerials.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-center text-muted">
                      No Queued / In Progress serials. Activate the batch if status is
                      Created.
                    </td>
                  </tr>
                ) : (
                  visibleSerials.map((serial) => (
                    <tr key={serial.serialNumber} className="border-t border-border">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedSerials.includes(serial.serialNumber)}
                          onChange={() => toggleSerial(serial.serialNumber)}
                        />
                      </td>
                      <td className="px-4 py-3 font-mono font-semibold">
                        {serial.serialNumber}
                      </td>
                      <td className="px-4 py-3">
                        {serial.currentProcessStepName || '—'}
                      </td>
                      <td className="px-4 py-3">{serial.status}</td>
                      <td className="px-4 py-3">{serial.completedPercent ?? 0}%</td>
                      <td className="px-4 py-3">{serial.shift || '—'}</td>
                      <td className="px-4 py-3">{serial.operatorName || '—'}</td>
                      <td className="px-4 py-3 text-xs text-muted max-w-[14rem]">
                        {serial.comments || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <p className="text-sm text-muted">
        Disputes and reviews:{' '}
        <Link to="/my-tasks" className="font-semibold text-accent">
          Manager Reviews
        </Link>
      </p>
    </div>
  )
}
