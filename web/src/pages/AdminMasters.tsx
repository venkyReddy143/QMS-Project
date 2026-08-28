import { useEffect, useState, type FormEvent } from 'react'
import { PlusCircle } from 'lucide-react'
import {
  createAdminCustomerApi,
  createAdminMachineApi,
  createAdminProcessStepApi,
  createAdminProductApi,
  deleteAdminCustomerApi,
  deleteAdminMachineApi,
  deleteAdminProcessStepApi,
  deleteAdminProductApi,
  fetchAdminCustomersApi,
  fetchAdminMachinesApi,
  fetchAdminProcessStepsApi,
  fetchAdminProductsApi,
  updateAdminCustomerApi,
  updateAdminMachineApi,
  updateAdminProcessStepApi,
  updateAdminProductApi,
} from '../lib/api/admin'
import type {
  AdminCustomer,
  AdminMachine,
  AdminProcessStep,
  AdminProduct,
} from '../types/admin'

const fieldClass =
  'min-h-12 w-full rounded-xl border border-border bg-surface-muted px-3 text-base text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/20'

const labelClass = 'block text-sm font-bold text-foreground'

type Tab = 'machines' | 'products' | 'process-steps' | 'customers'

const TAB_ACTIONS: Record<Tab, { create: string; view: string }> = {
  machines: { create: 'Create Machine', view: 'View Machines' },
  products: { create: 'Create Product', view: 'View Products' },
  'process-steps': { create: 'Create Process Step', view: 'View Process Steps' },
  customers: { create: 'Create Customer', view: 'View Customers' },
}

interface MasterTabProps {
  onNotice: (error: string | null, message: string | null) => void
  showForm: boolean
  onShowForm: (open: boolean) => void
  createTick: number
}

export function AdminMasters() {
  const [tab, setTab] = useState<Tab>('machines')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [createTick, setCreateTick] = useState(0)

  function flash(nextError: string | null, nextMessage: string | null) {
    setError(nextError)
    setMessage(nextMessage)
  }

  const action = TAB_ACTIONS[tab]

  return (
    <div className="space-y-4">
      <section className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-border bg-surface-raised p-5">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Masters</h2>
          <p className="mt-1 text-base text-muted">
            Create, update, or delete machines, products, process steps, and customers.
          </p>
        </div>
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
      </section>

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
  const [form, setForm] = useState(empty)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function load() {
    const response = await fetchAdminMachinesApi()
    setItems(response.machines ?? [])
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
          <Field
            label="Type"
            value={form.machineType}
            onChange={(value) => setForm((current) => ({ ...current, machineType: value }))}
          />
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
