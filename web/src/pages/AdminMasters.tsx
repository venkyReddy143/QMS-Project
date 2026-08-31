import { useEffect, useState, type FormEvent } from 'react'
import { ChevronLeft, ChevronRight, PlusCircle } from 'lucide-react'
import {
  createAdminCustomerApi,
  createAdminMachineApi,
  createAdminMachineTypeApi,
  createAdminProcessStepApi,
  createAdminProductApi,
  deleteAdminCustomerApi,
  deleteAdminMachineApi,
  deleteAdminMachineTypeApi,
  deleteAdminProcessStepApi,
  deleteAdminProductApi,
  fetchAdminCalendarsApi,
  fetchCalendarDayStatsApi,
  fetchCalendarHistoryApi,
  fetchAdminCustomersApi,
  fetchAdminMachinesApi,
  fetchAdminMachineTypesApi,
  fetchAdminProcessStepsApi,
  fetchAdminProductsApi,
  updateAdminCustomerApi,
  updateAdminMachineApi,
  updateAdminMachineTypeApi,
  updateAdminProcessStepApi,
  updateAdminProductApi,
} from '../lib/api/admin'
import type {
  AdminCalendar,
  AdminCustomer,
  AdminMachine,
  AdminMachineType,
  AdminProcessStep,
  AdminProduct,
  CalendarDayStats,
} from '../types/admin'

const fieldClass =
  'min-h-12 w-full rounded-xl border border-border bg-surface-muted px-3 text-base text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/20'

const labelClass = 'block text-sm font-bold text-foreground'

type Tab =
  | 'machines'
  | 'products'
  | 'process-steps'
  | 'customers'
  | 'machine-types'
  | 'calendars'

const TAB_ACTIONS: Record<Tab, { create: string; view: string; heading: string; description: string }> = {
  machines: {
    create: 'Create Machine',
    view: 'View Machines',
    heading: 'Machines',
    description: 'Create and maintain shop-floor machines.',
  },
  products: {
    create: 'Create Product',
    view: 'View Products',
    heading: 'Products',
    description: 'Create and maintain product masters.',
  },
  'process-steps': {
    create: 'Create Process Step',
    view: 'View Process Steps',
    heading: 'Process Steps',
    description: 'Create and maintain process steps.',
  },
  customers: {
    create: 'Create Customer',
    view: 'View Customers',
    heading: 'Customers',
    description: 'Create and maintain customers.',
  },
  'machine-types': {
    create: 'Create Machine Type',
    view: 'View Machine Types',
    heading: 'Machine Types',
    description: 'Create and maintain machine types used on machines.',
  },
  calendars: {
    create: 'Create Calendar',
    view: 'View Calenders',
    heading: 'Calenders',
    description: 'Select a date or browse past days to view plant activity.',
  },
}

interface MasterTabProps {
  onNotice: (error: string | null, message: string | null) => void
  showForm: boolean
  onShowForm: (open: boolean) => void
  createTick: number
}

export function AdminMasters({ section }: { section?: Tab } = {}) {
  const [tab, setTab] = useState<Tab>(section ?? 'machines')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [createTick, setCreateTick] = useState(0)

  useEffect(() => {
    if (!section) return
    setTab(section)
    setShowForm(false)
    setError(null)
    setMessage(null)
  }, [section])

  function flash(nextError: string | null, nextMessage: string | null) {
    setError(nextError)
    setMessage(nextMessage)
  }

  const action = TAB_ACTIONS[tab]

  return (
    <div className="space-y-4">
      <section className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-border bg-surface-raised p-5">
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            {section ? action.heading : 'Masters'}
          </h2>
          <p className="mt-1 text-base text-muted">
            {section
              ? action.description
              : 'Create, update, or delete machines, products, process steps, and customers.'}
          </p>
        </div>
        {tab !== 'calendars' ? (
        <button
          type="button"
          onClick={() => {
            if (showForm) {
              setShowForm(false)
              return
            }
            setShowForm(true)
            setCreateTick((current) => current + 1)
          }}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-bold text-white hover:brightness-110"
        >
          {showForm ? (
            action.view
          ) : (
            <>
              <PlusCircle className="h-4 w-4" />
              {action.create}
            </>
          )}
        </button>
        ) : null}
      </section>

      {!section ? (
      <div className="flex flex-wrap gap-2">
        {(
          [
            ['machines', 'Machines'],
            ['products', 'Products'],
            ['process-steps', 'Process Steps'],
            ['customers', 'Customers'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setTab(id)
              setShowForm(false)
              flash(null, null)
            }}
            className={`min-h-11 rounded-xl px-4 text-sm font-bold ${
              tab === id
                ? 'bg-accent text-white'
                : 'border border-border bg-surface-raised text-foreground'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
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

      {tab === 'machines' ? (
        <MachinesTab
          onNotice={flash}
          showForm={showForm}
          onShowForm={setShowForm}
          createTick={createTick}
        />
      ) : null}
      {tab === 'products' ? (
        <ProductsTab
          onNotice={flash}
          showForm={showForm}
          onShowForm={setShowForm}
          createTick={createTick}
        />
      ) : null}
      {tab === 'process-steps' ? (
        <ProcessStepsTab
          onNotice={flash}
          showForm={showForm}
          onShowForm={setShowForm}
          createTick={createTick}
        />
      ) : null}
      {tab === 'customers' ? (
        <CustomersTab
          onNotice={flash}
          showForm={showForm}
          onShowForm={setShowForm}
          createTick={createTick}
        />
      ) : null}
      {tab === 'machine-types' ? (
        <MachineTypesTab
          onNotice={flash}
          showForm={showForm}
          onShowForm={setShowForm}
          createTick={createTick}
        />
      ) : null}
      {tab === 'calendars' ? (
        <CalendarsTab
          onNotice={flash}
          showForm={showForm}
          onShowForm={setShowForm}
          createTick={createTick}
        />
      ) : null}
    </div>
  )
}

function MachinesTab({
  onNotice,
  showForm,
  onShowForm,
  createTick,
}: MasterTabProps) {
  const empty = {
    machineCode: '',
    name: '',
    machineType: '',
    bay: '',
    maxHoursPerShift: '7.5',
    status: 'AVAILABLE',
    maintenanceStatus: 'HEALTHY',
    active: true,
  }
  const [items, setItems] = useState<AdminMachine[]>([])
  const [types, setTypes] = useState<AdminMachineType[]>([])
  const [form, setForm] = useState(empty)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function load() {
    const [machinesResponse, typesResponse] = await Promise.all([
      fetchAdminMachinesApi(),
      fetchAdminMachineTypesApi(),
    ])
    setItems(machinesResponse.machines ?? [])
    setTypes(typesResponse.machineTypes ?? [])
  }

  useEffect(() => {
    void load().catch((loadError: unknown) =>
      onNotice(
        loadError instanceof Error ? loadError.message : 'Failed to load machines.',
        null,
      ),
    )
  }, [])

  useEffect(() => {
    if (createTick === 0) return
    setEditingId(null)
    setForm(empty)
  }, [createTick])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      const payload = {
        machineCode: form.machineCode.trim(),
        name: form.name.trim(),
        machineType: form.machineType.trim(),
        bay: form.bay.trim(),
        maxHoursPerShift: Number(form.maxHoursPerShift),
        status: form.status,
        maintenanceStatus: form.maintenanceStatus,
        active: form.active,
      }
      const response = editingId
        ? await updateAdminMachineApi(editingId, payload)
        : await createAdminMachineApi(payload)
      if (!response.success) {
        onNotice(response.message || 'Failed to save machine.', null)
        return
      }
      onNotice(null, response.message)
      setEditingId(null)
      setForm(empty)
      onShowForm(false)
      await load()
    } catch (saveError) {
      onNotice(
        saveError instanceof Error ? saveError.message : 'Failed to save machine.',
        null,
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {showForm ? (
      <section className="rounded-2xl border border-border bg-surface-raised p-5">
        <h3 className="mb-4 text-lg font-bold">
          {editingId ? 'Update Machine' : 'Create Machine'}
        </h3>
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Machine Code"
            value={form.machineCode}
            onChange={(value) => setForm((current) => ({ ...current, machineCode: value }))}
          />
          <Field
            label="Name"
            value={form.name}
            onChange={(value) => setForm((current) => ({ ...current, name: value }))}
          />
          <label className="block space-y-1.5">
            <span className={labelClass}>Type</span>
            {types.length > 0 ? (
              <select
                value={form.machineType}
                onChange={(event) =>
                  setForm((current) => ({ ...current, machineType: event.target.value }))
                }
                className={fieldClass}
                required
              >
                <option value="">Select type</option>
                {types.map((type) => (
                  <option key={type.id} value={type.name}>
                    {type.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={form.machineType}
                onChange={(event) =>
                  setForm((current) => ({ ...current, machineType: event.target.value }))
                }
                className={fieldClass}
                required
              />
            )}
          </label>
          <Field
            label="Bay"
            value={form.bay}
            required={false}
            onChange={(value) => setForm((current) => ({ ...current, bay: value }))}
          />
          <Field
            label="Max Hours / Shift"
            type="number"
            value={form.maxHoursPerShift}
            onChange={(value) =>
              setForm((current) => ({ ...current, maxHoursPerShift: value }))
            }
          />
          <label className="block space-y-1.5">
            <span className={labelClass}>Status</span>
            <select
              value={form.status}
              onChange={(event) =>
                setForm((current) => ({ ...current, status: event.target.value }))
              }
              className={fieldClass}
            >
              <option value="AVAILABLE">Available</option>
              <option value="BUSY">Busy</option>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="DOWN">Down</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </label>
          <div className="sm:col-span-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setEditingId(null)
                setForm(empty)
                onShowForm(false)
              }}
              className="min-h-12 rounded-xl border border-border px-6 text-sm font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="min-h-12 rounded-xl bg-accent px-8 text-base font-bold text-white disabled:opacity-70"
            >
              {saving ? 'Saving…' : editingId ? 'Update Machine' : 'Create Machine'}
            </button>
          </div>
        </form>
      </section>
      ) : (
      <MasterTable
        columns={['Code', 'Name', 'Type', 'Bay', 'Status', 'Active']}
        rows={items.map((item) => ({
          id: item.id,
          cells: [
            item.machineCode,
            item.name,
            item.machineType,
            item.bay || '—',
            item.status,
            item.active ? 'Yes' : 'No',
          ],
          onEdit: () => {
            setEditingId(item.id)
            onShowForm(true)
            setForm({
              machineCode: item.machineCode,
              name: item.name,
              machineType: item.machineType,
              bay: item.bay,
              maxHoursPerShift: String(item.maxHoursPerShift),
              status: item.status,
              maintenanceStatus: item.maintenanceStatus,
              active: item.active,
            })
          },
          onDelete: () => {
            if (!window.confirm(`Delete ${item.machineCode}?`)) return
            void deleteAdminMachineApi(item.id)
              .then(async (response) => {
                if (!response.success) {
                  onNotice(response.message || 'Failed to delete machine.', null)
                  return
                }
                if (editingId === item.id) {
                  setEditingId(null)
                  setForm(empty)
                }
                onNotice(null, response.message)
                await load()
              })
              .catch((deleteError: unknown) =>
                onNotice(
                  deleteError instanceof Error
                    ? deleteError.message
                    : 'Failed to delete machine.',
                  null,
                ),
              )
          },
        }))}
        empty="No machines yet."
      />
      )}
    </>
  )
}

function ProductsTab({
  onNotice,
  showForm,
  onShowForm,
  createTick,
}: MasterTabProps) {
  const empty = {
    productCode: '',
    name: '',
    description: '',
    uom: 'PCS',
    unitRate: '',
    productType: 'PRODUCT',
    status: 'ACTIVE',
  }
  const [items, setItems] = useState<AdminProduct[]>([])
  const [form, setForm] = useState(empty)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function load() {
    const response = await fetchAdminProductsApi()
    setItems(response.products ?? [])
  }

  useEffect(() => {
    void load().catch((loadError: unknown) =>
      onNotice(
        loadError instanceof Error ? loadError.message : 'Failed to load products.',
        null,
      ),
    )
  }, [])

  useEffect(() => {
    if (createTick === 0) return
    setEditingId(null)
    setForm(empty)
  }, [createTick])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      const payload = {
        productCode: form.productCode.trim(),
        name: form.name.trim(),
        description: form.description.trim(),
        uom: form.uom.trim() || 'PCS',
        unitRate: Number(form.unitRate || 0),
        productType: form.productType,
        status: form.status,
      }
      const response = editingId
        ? await updateAdminProductApi(editingId, payload)
        : await createAdminProductApi(payload)
      if (!response.success) {
        onNotice(response.message || 'Failed to save product.', null)
        return
      }
      onNotice(null, response.message)
      setEditingId(null)
      setForm(empty)
      onShowForm(false)
      await load()
    } catch (saveError) {
      onNotice(
        saveError instanceof Error ? saveError.message : 'Failed to save product.',
        null,
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {showForm ? (
      <section className="rounded-2xl border border-border bg-surface-raised p-5">
        <h3 className="mb-4 text-lg font-bold">
          {editingId ? 'Update Product' : 'Create Product'}
        </h3>
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Product Code"
            value={form.productCode}
            onChange={(value) => setForm((current) => ({ ...current, productCode: value }))}
          />
          <Field
            label="Name"
            value={form.name}
            onChange={(value) => setForm((current) => ({ ...current, name: value }))}
          />
          <Field
            label="Description"
            required={false}
            value={form.description}
            onChange={(value) => setForm((current) => ({ ...current, description: value }))}
          />
          <Field
            label="UOM"
            value={form.uom}
            onChange={(value) => setForm((current) => ({ ...current, uom: value }))}
          />
          <Field
            label="Unit Rate"
            type="number"
            value={form.unitRate}
            onChange={(value) => setForm((current) => ({ ...current, unitRate: value }))}
          />
          <label className="block space-y-1.5">
            <span className={labelClass}>Status</span>
            <select
              value={form.status}
              onChange={(event) =>
                setForm((current) => ({ ...current, status: event.target.value }))
              }
              className={fieldClass}
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </label>
          <div className="sm:col-span-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setEditingId(null)
                setForm(empty)
                onShowForm(false)
              }}
              className="min-h-12 rounded-xl border border-border px-6 text-sm font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="min-h-12 rounded-xl bg-accent px-8 text-base font-bold text-white disabled:opacity-70"
            >
              {saving ? 'Saving…' : editingId ? 'Update Product' : 'Create Product'}
            </button>
          </div>
        </form>
      </section>
      ) : (
      <MasterTable
        columns={['Code', 'Name', 'UOM', 'Unit Rate', 'Status']}
        rows={items.map((item) => ({
          id: item.id,
          cells: [
            item.productCode,
            item.name,
            item.uom,
            String(item.unitRate),
            item.status === 'ACTIVE' ? 'Active' : 'Inactive',
          ],
          onEdit: () => {
            setEditingId(item.id)
            onShowForm(true)
            setForm({
              productCode: item.productCode,
              name: item.name,
              description: item.description,
              uom: item.uom,
              unitRate: String(item.unitRate),
              productType: item.productType,
              status: item.status,
            })
          },
          onDelete: () => {
            if (!window.confirm(`Delete ${item.productCode}?`)) return
            void deleteAdminProductApi(item.id)
              .then(async (response) => {
                if (!response.success) {
                  onNotice(response.message || 'Failed to delete product.', null)
                  return
                }
                if (editingId === item.id) {
                  setEditingId(null)
                  setForm(empty)
                }
                onNotice(null, response.message)
                await load()
              })
              .catch((deleteError: unknown) =>
                onNotice(
                  deleteError instanceof Error
                    ? deleteError.message
                    : 'Failed to delete product.',
                  null,
                ),
              )
          },
        }))}
        empty="No products yet."
      />
      )}
    </>
  )
}

function ProcessStepsTab({
  onNotice,
  showForm,
  onShowForm,
  createTick,
}: MasterTabProps) {
  const empty = {
    code: '',
    name: '',
    category: '',
    standardHoursPerPiece: '',
    requiresQualityRelease: false,
    status: 'ACTIVE',
  }
  const [items, setItems] = useState<AdminProcessStep[]>([])
  const [form, setForm] = useState(empty)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function load() {
    const response = await fetchAdminProcessStepsApi()
    setItems(response.processSteps ?? [])
  }

  useEffect(() => {
    void load().catch((loadError: unknown) =>
      onNotice(
        loadError instanceof Error
          ? loadError.message
          : 'Failed to load process steps.',
        null,
      ),
    )
  }, [])

  useEffect(() => {
    if (createTick === 0) return
    setEditingId(null)
    setForm(empty)
  }, [createTick])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      const payload = {
        code: form.code.trim(),
        name: form.name.trim(),
        category: form.category.trim(),
        standardHoursPerPiece: Number(form.standardHoursPerPiece || 0),
        requiresQualityRelease: form.requiresQualityRelease,
        status: form.status,
      }
      const response = editingId
        ? await updateAdminProcessStepApi(editingId, payload)
        : await createAdminProcessStepApi(payload)
      if (!response.success) {
        onNotice(response.message || 'Failed to save process step.', null)
        return
      }
      onNotice(null, response.message)
      setEditingId(null)
      setForm(empty)
      onShowForm(false)
      await load()
    } catch (saveError) {
      onNotice(
        saveError instanceof Error
          ? saveError.message
          : 'Failed to save process step.',
        null,
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {showForm ? (
      <section className="rounded-2xl border border-border bg-surface-raised p-5">
        <h3 className="mb-4 text-lg font-bold">
          {editingId ? 'Update Process Step' : 'Create Process Step'}
        </h3>
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Code"
            value={form.code}
            onChange={(value) => setForm((current) => ({ ...current, code: value }))}
          />
          <Field
            label="Name"
            value={form.name}
            onChange={(value) => setForm((current) => ({ ...current, name: value }))}
          />
          <Field
            label="Category"
            value={form.category}
            onChange={(value) => setForm((current) => ({ ...current, category: value }))}
          />
          <Field
            label="Hours / Piece"
            type="number"
            value={form.standardHoursPerPiece}
            onChange={(value) =>
              setForm((current) => ({ ...current, standardHoursPerPiece: value }))
            }
          />
          <label className="flex items-center gap-2 pt-8">
            <input
              type="checkbox"
              checked={form.requiresQualityRelease}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  requiresQualityRelease: event.target.checked,
                }))
              }
            />
            <span className={labelClass}>Requires quality release</span>
          </label>
          <label className="block space-y-1.5">
            <span className={labelClass}>Status</span>
            <select
              value={form.status}
              onChange={(event) =>
                setForm((current) => ({ ...current, status: event.target.value }))
              }
              className={fieldClass}
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </label>
          <div className="sm:col-span-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setEditingId(null)
                setForm(empty)
                onShowForm(false)
              }}
              className="min-h-12 rounded-xl border border-border px-6 text-sm font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="min-h-12 rounded-xl bg-accent px-8 text-base font-bold text-white disabled:opacity-70"
            >
              {saving ? 'Saving…' : editingId ? 'Update Step' : 'Create Step'}
            </button>
          </div>
        </form>
      </section>
      ) : (
      <MasterTable
        columns={['Code', 'Name', 'Category', 'Hours / Pc', 'Status']}
        rows={items.map((item) => ({
          id: item.id,
          cells: [
            item.code,
            item.name,
            item.category,
            String(item.standardHoursPerPiece),
            item.status === 'ACTIVE' ? 'Active' : 'Inactive',
          ],
          onEdit: () => {
            setEditingId(item.id)
            onShowForm(true)
            setForm({
              code: item.code,
              name: item.name,
              category: item.category,
              standardHoursPerPiece: String(item.standardHoursPerPiece),
              requiresQualityRelease: item.requiresQualityRelease,
              status: item.status,
            })
          },
          onDelete: () => {
            if (!window.confirm(`Delete ${item.code}?`)) return
            void deleteAdminProcessStepApi(item.id)
              .then(async (response) => {
                if (!response.success) {
                  onNotice(response.message || 'Failed to delete process step.', null)
                  return
                }
                if (editingId === item.id) {
                  setEditingId(null)
                  setForm(empty)
                }
                onNotice(null, response.message)
                await load()
              })
              .catch((deleteError: unknown) =>
                onNotice(
                  deleteError instanceof Error
                    ? deleteError.message
                    : 'Failed to delete process step.',
                  null,
                ),
              )
          },
        }))}
        empty="No process steps yet."
      />
      )}
    </>
  )
}

function CustomersTab({
  onNotice,
  showForm,
  onShowForm,
  createTick,
}: MasterTabProps) {
  const empty = { name: '', status: 'ACTIVE' }
  const [items, setItems] = useState<AdminCustomer[]>([])
  const [form, setForm] = useState(empty)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function load() {
    const response = await fetchAdminCustomersApi()
    setItems(response.customers ?? [])
  }

  useEffect(() => {
    void load().catch((loadError: unknown) =>
      onNotice(
        loadError instanceof Error ? loadError.message : 'Failed to load customers.',
        null,
      ),
    )
  }, [])

  useEffect(() => {
    if (createTick === 0) return
    setEditingId(null)
    setForm(empty)
  }, [createTick])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      const payload = { name: form.name.trim(), status: form.status }
      const response = editingId
        ? await updateAdminCustomerApi(editingId, payload)
        : await createAdminCustomerApi(payload)
      if (!response.success) {
        onNotice(response.message || 'Failed to save customer.', null)
        return
      }
      onNotice(null, response.message)
      setEditingId(null)
      setForm(empty)
      onShowForm(false)
      await load()
    } catch (saveError) {
      onNotice(
        saveError instanceof Error ? saveError.message : 'Failed to save customer.',
        null,
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {showForm ? (
      <section className="rounded-2xl border border-border bg-surface-raised p-5">
        <h3 className="mb-4 text-lg font-bold">
          {editingId ? 'Update Customer' : 'Create Customer'}
        </h3>
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Customer Name"
            value={form.name}
            onChange={(value) => setForm((current) => ({ ...current, name: value }))}
          />
          <label className="block space-y-1.5">
            <span className={labelClass}>Status</span>
            <select
              value={form.status}
              onChange={(event) =>
                setForm((current) => ({ ...current, status: event.target.value }))
              }
              className={fieldClass}
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </label>
          <div className="sm:col-span-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setEditingId(null)
                setForm(empty)
                onShowForm(false)
              }}
              className="min-h-12 rounded-xl border border-border px-6 text-sm font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="min-h-12 rounded-xl bg-accent px-8 text-base font-bold text-white disabled:opacity-70"
            >
              {saving ? 'Saving…' : editingId ? 'Update Customer' : 'Create Customer'}
            </button>
          </div>
        </form>
      </section>
      ) : (
      <MasterTable
        columns={['Name', 'Status']}
        rows={items.map((item) => ({
          id: item.id,
          cells: [item.name, item.status === 'ACTIVE' ? 'Active' : 'Inactive'],
          onEdit: () => {
            setEditingId(item.id)
            onShowForm(true)
            setForm({ name: item.name, status: item.status })
          },
          onDelete: () => {
            if (!window.confirm(`Delete ${item.name}?`)) return
            void deleteAdminCustomerApi(item.id)
              .then(async (response) => {
                if (!response.success) {
                  onNotice(response.message || 'Failed to delete customer.', null)
                  return
                }
                if (editingId === item.id) {
                  setEditingId(null)
                  setForm(empty)
                }
                onNotice(null, response.message)
                await load()
              })
              .catch((deleteError: unknown) =>
                onNotice(
                  deleteError instanceof Error
                    ? deleteError.message
                    : 'Failed to delete customer.',
                  null,
                ),
              )
          },
        }))}
        empty="No customers yet."
      />
      )}
    </>
  )
}

const WEEKDAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
]

function MachineTypesTab({
  onNotice,
  showForm,
  onShowForm,
  createTick,
}: MasterTabProps) {
  const empty = { name: '', status: 'ACTIVE' }
  const [items, setItems] = useState<AdminMachineType[]>([])
  const [form, setForm] = useState(empty)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function load() {
    const response = await fetchAdminMachineTypesApi()
    setItems(response.machineTypes ?? [])
  }

  useEffect(() => {
    void load().catch((loadError: unknown) =>
      onNotice(
        loadError instanceof Error
          ? loadError.message
          : 'Failed to load machine types.',
        null,
      ),
    )
  }, [])

  useEffect(() => {
    if (createTick === 0) return
    setEditingId(null)
    setForm(empty)
  }, [createTick])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      const payload = { name: form.name.trim(), status: form.status }
      const response = editingId
        ? await updateAdminMachineTypeApi(editingId, payload)
        : await createAdminMachineTypeApi(payload)
      if (!response.success) {
        onNotice(response.message || 'Failed to save machine type.', null)
        return
      }
      onNotice(null, response.message)
      setEditingId(null)
      setForm(empty)
      onShowForm(false)
      await load()
    } catch (saveError) {
      onNotice(
        saveError instanceof Error ? saveError.message : 'Failed to save machine type.',
        null,
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {showForm ? (
      <section className="rounded-2xl border border-border bg-surface-raised p-5">
        <h3 className="mb-4 text-lg font-bold">
          {editingId ? 'Update Machine Type' : 'Create Machine Type'}
        </h3>
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Name"
            value={form.name}
            onChange={(value) => setForm((current) => ({ ...current, name: value }))}
          />
          <label className="block space-y-1.5">
            <span className={labelClass}>Status</span>
            <select
              value={form.status}
              onChange={(event) =>
                setForm((current) => ({ ...current, status: event.target.value }))
              }
              className={fieldClass}
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </label>
          <div className="sm:col-span-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setEditingId(null)
                setForm(empty)
                onShowForm(false)
              }}
              className="min-h-12 rounded-xl border border-border px-6 text-sm font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="min-h-12 rounded-xl bg-accent px-8 text-base font-bold text-white disabled:opacity-70"
            >
              {saving ? 'Saving…' : editingId ? 'Update Machine Type' : 'Create Machine Type'}
            </button>
          </div>
        </form>
      </section>
      ) : (
      <MasterTable
        columns={['Name', 'Status']}
        rows={items.map((item) => ({
          id: item.id,
          cells: [item.name, item.status === 'ACTIVE' ? 'Active' : 'Inactive'],
          onEdit: () => {
            setEditingId(item.id)
            onShowForm(true)
            setForm({ name: item.name, status: item.status })
          },
          onDelete: () => {
            if (!window.confirm(`Delete ${item.name}?`)) return
            void deleteAdminMachineTypeApi(item.id)
              .then(async (response) => {
                if (!response.success) {
                  onNotice(response.message || 'Failed to delete machine type.', null)
                  return
                }
                if (editingId === item.id) {
                  setEditingId(null)
                  setForm(empty)
                }
                onNotice(null, response.message)
                await load()
              })
              .catch((deleteError: unknown) =>
                onNotice(
                  deleteError instanceof Error
                    ? deleteError.message
                    : 'Failed to delete machine type.',
                  null,
                ),
              )
          },
        }))}
        empty="No machine types yet."
      />
      )}
    </>
  )
}

function toIsoDate(value: Date) {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function addDaysIsoLocal(isoDate: string, days: number) {
  const date = new Date(`${isoDate}T12:00:00`)
  date.setDate(date.getDate() + days)
  return toIsoDate(date)
}

const MONTH_LABELS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

const CALENDAR_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function weekdayNameFromDate(value: Date) {
  return WEEKDAYS[value.getDay() === 0 ? 6 : value.getDay() - 1]
}

function monthCells(year: number, month: number) {
  const first = new Date(year, month, 1)
  const startPad = first.getDay()
  const days = new Date(year, month + 1, 0).getDate()
  const cells: Array<{ date: Date; iso: string; inMonth: boolean }> = []
  for (let index = 0; index < startPad; index += 1) {
    const date = new Date(year, month, index - startPad + 1)
    cells.push({ date, iso: toIsoDate(date), inMonth: false })
  }
  for (let day = 1; day <= days; day += 1) {
    const date = new Date(year, month, day)
    cells.push({ date, iso: toIsoDate(date), inMonth: true })
  }
  while (cells.length % 7 !== 0) {
    const date = new Date(year, month, days + (cells.length - startPad - days) + 1)
    cells.push({ date, iso: toIsoDate(date), inMonth: false })
  }
  return cells
}

function CalendarsTab({
  onNotice,
}: MasterTabProps) {
  const emptyWorkingDays = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ]
  const todayIso = toIsoDate(new Date())
  const defaultFrom = addDaysIsoLocal(todayIso, -29)
  const [items, setItems] = useState<AdminCalendar[]>([])
  const [cursor, setCursor] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })
  const [selectedDate, setSelectedDate] = useState(todayIso)
  const [fromDate, setFromDate] = useState(defaultFrom)
  const [toDate, setToDate] = useState(todayIso)
  const [appliedFrom, setAppliedFrom] = useState(defaultFrom)
  const [appliedTo, setAppliedTo] = useState(todayIso)
  const [dayStats, setDayStats] = useState<CalendarDayStats | null>(null)
  const [dayLoading, setDayLoading] = useState(false)
  const [history, setHistory] = useState<CalendarDayStats[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  const plant = items.find((item) => item.status === 'ACTIVE') ?? items[0]
  const workingDays = plant?.workingDays?.length
    ? plant.workingDays
    : emptyWorkingDays

  useEffect(() => {
    void fetchAdminCalendarsApi()
      .then((response) => setItems(response.calendars ?? []))
      .catch((loadError: unknown) =>
        onNotice(
          loadError instanceof Error
            ? loadError.message
            : 'Failed to load calendars.',
          null,
        ),
      )
  }, [])

  useEffect(() => {
    let active = true
    setHistoryLoading(true)
    void fetchCalendarHistoryApi(appliedFrom, appliedTo)
      .then((response) => {
        if (!active) return
        setHistory(response.days ?? [])
      })
      .catch((loadError: unknown) => {
        if (!active) return
        onNotice(
          loadError instanceof Error
            ? loadError.message
            : 'Failed to load day history.',
          null,
        )
      })
      .finally(() => {
        if (active) setHistoryLoading(false)
      })
    return () => {
      active = false
    }
  }, [appliedFrom, appliedTo])

  useEffect(() => {
    let active = true
    setDayLoading(true)
    setDayStats(null)
    void fetchCalendarDayStatsApi(selectedDate)
      .then((response) => {
        if (!active) return
        setDayStats(response.stats ?? null)
      })
      .catch((loadError: unknown) => {
        if (!active) return
        onNotice(
          loadError instanceof Error
            ? loadError.message
            : 'Failed to load day stats.',
          null,
        )
      })
      .finally(() => {
        if (active) setDayLoading(false)
      })
    return () => {
      active = false
    }
  }, [selectedDate])

  function jumpToDate(iso: string) {
    const next = iso > todayIso ? todayIso : iso
    setSelectedDate(next)
    const date = new Date(`${next}T12:00:00`)
    setCursor({ year: date.getFullYear(), month: date.getMonth() })
  }

  function applyDateFilter() {
    let from = fromDate || defaultFrom
    let to = toDate || todayIso
    if (to > todayIso) to = todayIso
    if (from > to) {
      const swap = from
      from = to
      to = swap
    }
    setFromDate(from)
    setToDate(to)
    setAppliedFrom(from)
    setAppliedTo(to)
    jumpToDate(to)
  }

  function resetDateFilter() {
    setFromDate(defaultFrom)
    setToDate(todayIso)
    setAppliedFrom(defaultFrom)
    setAppliedTo(todayIso)
    jumpToDate(todayIso)
  }

  function shiftMonth(delta: number) {
    setCursor((current) => {
      const next = new Date(current.year, current.month + delta, 1)
      return { year: next.getFullYear(), month: next.getMonth() }
    })
  }

  const cells = monthCells(cursor.year, cursor.month)
  const selectedLabel = new Date(`${selectedDate}T12:00:00`).toLocaleDateString(
    'en-IN',
    { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
  )

  return (
    <>
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="rounded-2xl border border-border bg-surface-raised p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border hover:border-accent"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h3 className="text-lg font-bold">
              {MONTH_LABELS[cursor.month]} {cursor.year}
            </h3>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border hover:border-accent"
              aria-label="Next month"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold uppercase tracking-wide text-muted">
            {CALENDAR_HEADERS.map((label) => (
              <div key={label} className="py-2">
                {label}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((cell) => {
              const selected = cell.iso === selectedDate
              const isToday = cell.iso === todayIso
              const inRange = cell.iso >= appliedFrom && cell.iso <= appliedTo
              const off = !workingDays.includes(weekdayNameFromDate(cell.date))
              return (
                <button
                  key={cell.iso}
                  type="button"
                  onClick={() => jumpToDate(cell.iso)}
                  className={[
                    'min-h-12 rounded-xl text-sm font-semibold transition',
                    cell.inMonth ? '' : 'opacity-40',
                    selected
                      ? 'bg-accent text-white'
                      : off
                        ? 'bg-surface-muted text-muted hover:border-border'
                        : 'hover:bg-accent-soft hover:text-accent',
                    isToday && !selected ? 'ring-2 ring-accent/40' : '',
                    inRange && !selected && cell.inMonth ? 'bg-accent-soft/60' : '',
                  ].join(' ')}
                >
                  {cell.date.getDate()}
                </button>
              )
            })}
          </div>
          <p className="mt-3 text-xs text-muted">
            Working days follow {plant?.name ?? 'Plant Calendar'}. Off days are
            shaded. Click a date to see that day’s activity.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-surface-raised p-4">
          <p className="text-sm font-bold text-accent">
            {dayStats?.isWorkingDay === false ? 'Weekly off' : 'Selected day'}
          </p>
          <div className="mt-2 flex flex-wrap items-end gap-3">
            <label className="block min-w-[180px] space-y-1">
              <span className="text-xs font-bold text-muted">Pick a date</span>
              <input
                type="date"
                value={selectedDate}
                max={todayIso}
                onChange={(event) => {
                  if (event.target.value) jumpToDate(event.target.value)
                }}
                className={fieldClass}
              />
            </label>
          </div>
          <h3 className="mt-3 text-xl font-bold">{selectedLabel}</h3>
          {dayLoading ? (
            <p className="mt-4 text-sm text-muted">Loading day activity…</p>
          ) : dayStats ? (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <DayStat
                  label="Machines working"
                  value={dayStats.machines.working}
                  hint="Available + busy"
                />
                <DayStat
                  label="Under repair"
                  value={dayStats.machines.repaired}
                  hint="Maintenance"
                />
                <DayStat
                  label="Down"
                  value={dayStats.machines.down}
                  hint="Stopped"
                />
                <DayStat
                  label="Inactive"
                  value={dayStats.machines.inactive}
                  hint={`of ${dayStats.machines.total}`}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <DayStat
                  label="Orders going on"
                  value={dayStats.ordersOngoing}
                  hint="In production / on hold"
                />
                <DayStat
                  label="Orders created"
                  value={dayStats.ordersCreated}
                  hint="Raised this day"
                />
                <DayStat
                  label="Employees working"
                  value={dayStats.employeesWorking}
                  hint={`${dayStats.hoursLogged} hrs logged`}
                />
                <DayStat
                  label="On leave / absent"
                  value={dayStats.employeesOnLeave}
                  hint={
                    dayStats.isWorkingDay
                      ? `${dayStats.employeesTotal} active staff`
                      : 'Weekly off'
                  }
                />
                <DayStat
                  label="Products produced"
                  value={dayStats.productsProduced}
                  hint="Completed pieces on batches worked"
                />
                <DayStat
                  label="Batches worked"
                  value={dayStats.batchesWorked}
                  hint="With logs or assignments"
                />
              </div>
              {dayStats.workingNames.length > 0 ? (
                <p className="text-sm text-muted">
                  <span className="font-bold text-foreground">Working: </span>
                  {dayStats.workingNames.map((person) => person.name).join(', ')}
                </p>
              ) : null}
              {dayStats.leaveNames.length > 0 ? (
                <p className="text-sm text-muted">
                  <span className="font-bold text-foreground">Leave / absent: </span>
                  {dayStats.leaveNames.map((person) => person.name).join(', ')}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted">No activity loaded.</p>
          )}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-border bg-surface-raised">
        <div className="border-b border-border px-4 py-3">
          <h3 className="text-base font-bold">Past days</h3>
          <p className="text-sm text-muted">
            Choose a from and to date, then show results for that range.
            {historyLoading
              ? ''
              : ` Showing ${history.length} day${history.length === 1 ? '' : 's'}.`}
          </p>
          <form
            className="mt-3 flex flex-wrap items-end gap-3"
            onSubmit={(event) => {
              event.preventDefault()
              applyDateFilter()
            }}
          >
            <label className="block space-y-1">
              <span className="text-xs font-bold text-muted">From</span>
              <input
                type="date"
                value={fromDate}
                max={todayIso}
                onChange={(event) => setFromDate(event.target.value)}
                className={fieldClass}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-bold text-muted">To</span>
              <input
                type="date"
                value={toDate}
                max={todayIso}
                onChange={(event) => setToDate(event.target.value)}
                className={fieldClass}
              />
            </label>
            <button
              type="submit"
              className="inline-flex min-h-12 items-center rounded-xl bg-accent px-5 text-sm font-bold text-white hover:brightness-110"
            >
              Show results
            </button>
            <button
              type="button"
              onClick={resetDateFilter}
              className="inline-flex min-h-12 items-center rounded-xl border border-border px-5 text-sm font-bold"
            >
              Reset
            </button>
          </form>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-surface-muted text-xs font-bold uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Day</th>
                <th className="px-4 py-3">Machines working</th>
                <th className="px-4 py-3">Repair</th>
                <th className="px-4 py-3">Orders going on</th>
                <th className="px-4 py-3">Orders created</th>
                <th className="px-4 py-3">Employees working</th>
                <th className="px-4 py-3">On leave</th>
                <th className="px-4 py-3">Products produced</th>
                <th className="px-4 py-3">Hours</th>
              </tr>
            </thead>
            <tbody>
              {historyLoading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-muted">
                    Loading past days…
                  </td>
                </tr>
              ) : history.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-muted">
                    No days in this date range.
                  </td>
                </tr>
              ) : (
                history.map((row) => (
                  <tr
                    key={row.date}
                    className={`cursor-pointer border-t border-border ${
                      row.date === selectedDate ? 'bg-accent-soft' : ''
                    }`}
                    onClick={() => jumpToDate(row.date)}
                  >
                    <td className="px-4 py-3 font-semibold">{row.date}</td>
                    <td className="px-4 py-3">
                      {row.weekday.slice(0, 3)}
                      {row.isWorkingDay ? '' : ' · Off'}
                    </td>
                    <td className="px-4 py-3">{row.machines.working}</td>
                    <td className="px-4 py-3">{row.machines.repaired}</td>
                    <td className="px-4 py-3">{row.ordersOngoing}</td>
                    <td className="px-4 py-3">{row.ordersCreated}</td>
                    <td className="px-4 py-3">{row.employeesWorking}</td>
                    <td className="px-4 py-3">{row.employeesOnLeave}</td>
                    <td className="px-4 py-3">{row.productsProduced}</td>
                    <td className="px-4 py-3">{row.hoursLogged}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}
function DayStat({
  label,
  value,
  hint,
}: {
  label: string
  value: number
  hint: string
}) {
  return (
    <div className="rounded-xl border border-border bg-surface-muted px-3 py-3">
      <p className="text-xs font-bold text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
      <p className="mt-0.5 text-xs text-muted">{hint}</p>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  required = true,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  required?: boolean
}) {
  return (
    <label className="block space-y-1.5">
      <span className={labelClass}>{label}</span>
      <input
        type={type}
        value={value}
        required={required}
        min={type === 'number' ? 0 : undefined}
        step={type === 'number' ? 'any' : undefined}
        onChange={(event) => onChange(event.target.value)}
        className={fieldClass}
      />
    </label>
  )
}

function MasterTable({
  columns,
  rows,
  empty,
}: {
  columns: string[]
  rows: Array<{
    id: string
    cells: string[]
    onEdit: () => void
    onDelete: () => void
  }>
  empty: string
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-surface-raised">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-surface-muted text-xs font-bold uppercase tracking-wide text-muted">
            <tr>
              {columns.map((column) => (
                <th key={column} className="px-4 py-3">
                  {column}
                </th>
              ))}
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + 1}
                  className="px-4 py-8 text-center text-muted"
                >
                  {empty}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-t border-border">
                  {row.cells.map((cell, index) => (
                    <td
                      key={`${row.id}-${index}`}
                      className={`px-4 py-3 ${index === 0 ? 'font-semibold' : ''}`}
                    >
                      {cell}
                    </td>
                  ))}
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={row.onEdit}
                        className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:border-accent hover:text-accent"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={row.onDelete}
                        className="rounded-lg border border-danger/30 px-3 py-1.5 text-xs font-bold text-danger"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
