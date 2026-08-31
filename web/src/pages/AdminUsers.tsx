import { useEffect, useState, type FormEvent } from 'react'
import { PlusCircle } from 'lucide-react'
import {
  createAdminUserApi,
  deleteAdminUserApi,
  fetchAdminUsersApi,
  updateAdminUserApi,
} from '../lib/api/admin'
import { useAuth } from '../context/AuthContext'
import type { ApiUserRole } from '../types/auth'
import { ASSIGNABLE_ROLES, type AdminUserRecord } from '../types/admin'

const fieldClass =
  'min-h-12 w-full rounded-xl border border-border bg-surface-muted px-3 text-base text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/20'

const labelClass = 'block text-sm font-bold text-foreground'

function roleLabel(role: string): string {
  return ASSIGNABLE_ROLES.find((item) => item.value === role)?.label ?? role
}

function emptyForm() {
  return {
    employeeCode: '',
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'MANAGER' as ApiUserRole,
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
  }
}

export function AdminUsers({ title = 'Users' }: { title?: string } = {}) {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<AdminUserRecord[]>([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)

  async function loadUsers() {
    const response = await fetchAdminUsersApi()
    setUsers(response.users ?? [])
  }

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const response = await fetchAdminUsersApi()
        if (!active) return
        setUsers(response.users ?? [])
      } catch (loadError) {
        if (!active) return
        setError(
          loadError instanceof Error ? loadError.message : 'Failed to load users.',
        )
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [])

  function startEdit(user: AdminUserRecord) {
    setEditingId(user.id)
    setForm({
      employeeCode: user.employeeCode,
      name: user.name,
      email: user.email,
      phone: user.phone,
      password: '',
      role: user.role,
      status: user.status,
    })
    setShowForm(true)
    setError(null)
    setMessage(null)
  }

  function resetForm() {
    setEditingId(null)
    setForm(emptyForm())
    setShowForm(false)
  }

  function openCreate() {
    setEditingId(null)
    setForm(emptyForm())
    setShowForm(true)
    setError(null)
    setMessage(null)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setMessage(null)
    setSaving(true)
    try {
      if (editingId) {
        const response = await updateAdminUserApi(editingId, {
          employeeCode: form.employeeCode.trim(),
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          role: form.role,
          status: form.status,
          password: form.password.trim() || undefined,
        })
        if (!response.success) {
          setError(response.message || 'Failed to update user.')
          return
        }
        setMessage(response.message)
      } else {
        const response = await createAdminUserApi({
          employeeCode: form.employeeCode.trim(),
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          password: form.password.trim(),
          role: form.role,
          status: form.status,
        })
        if (!response.success) {
          setError(response.message || 'Failed to create user.')
          return
        }
        setMessage(response.message)
      }
      resetForm()
      await loadUsers()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save user.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(user: AdminUserRecord) {
    if (user.id === currentUser?.id) {
      setError('You cannot delete your own account.')
      return
    }
    if (!window.confirm(`Delete ${user.name}? This cannot be undone.`)) return
    setError(null)
    setMessage(null)
    try {
      const response = await deleteAdminUserApi(user.id)
      if (!response.success) {
        setError(response.message || 'Failed to delete user.')
        return
      }
      if (editingId === user.id) resetForm()
      setMessage(response.message)
      await loadUsers()
    } catch (deleteError) {
      setError(
        deleteError instanceof Error ? deleteError.message : 'Failed to delete user.',
      )
    }
  }

  return (
    <div className="space-y-4">
      <section className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-border bg-surface-raised p-5">
        <div>
          <h2 className="text-2xl font-bold text-foreground">{title}</h2>
          <p className="mt-1 text-base text-muted">
            {title === 'Workers'
              ? 'Create workers and assign or update their roles.'
              : 'Create users and assign or update their roles. Existing role screens stay unchanged.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => (showForm ? resetForm() : openCreate())}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-bold text-white hover:brightness-110"
        >
          {showForm ? (
            title === 'Workers' ? 'View Workers' : 'View Users'
          ) : (
            <>
              <PlusCircle className="h-4 w-4" />
              {title === 'Workers' ? 'Create Worker' : 'Create User'}
            </>
          )}
        </button>
      </section>

      {showForm ? (
        <section className="rounded-2xl border border-border bg-surface-raised p-5">
          <h3 className="mb-4 text-lg font-bold">
            {editingId
              ? title === 'Workers'
                ? 'Update Worker'
                : 'Update User'
              : title === 'Workers'
                ? 'Create Worker'
                : 'Create User'}
          </h3>
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className={labelClass}>Employee Code</span>
            <input
              value={form.employeeCode}
              onChange={(event) =>
                setForm((current) => ({ ...current, employeeCode: event.target.value }))
              }
              className={fieldClass}
              required
            />
          </label>
          <label className="block space-y-1.5">
            <span className={labelClass}>Name</span>
            <input
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({ ...current, name: event.target.value }))
              }
              className={fieldClass}
              required
            />
          </label>
          <label className="block space-y-1.5">
            <span className={labelClass}>Email</span>
            <input
              type="email"
              value={form.email}
              onChange={(event) =>
                setForm((current) => ({ ...current, email: event.target.value }))
              }
              className={fieldClass}
              required
            />
          </label>
          <label className="block space-y-1.5">
            <span className={labelClass}>Phone</span>
            <input
              value={form.phone}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  phone: event.target.value.replace(/\D/g, '').slice(0, 10),
                }))
              }
              className={fieldClass}
              required
            />
          </label>
          <label className="block space-y-1.5">
            <span className={labelClass}>
              Password {editingId ? '(leave blank to keep)' : ''}
            </span>
            <input
              type="password"
              value={form.password}
              onChange={(event) =>
                setForm((current) => ({ ...current, password: event.target.value }))
              }
              className={fieldClass}
              required={!editingId}
              minLength={editingId ? undefined : 6}
            />
          </label>
          <label className="block space-y-1.5">
            <span className={labelClass}>Role</span>
            <select
              value={form.role}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  role: event.target.value as ApiUserRole,
                }))
              }
              className={fieldClass}
            >
              {ASSIGNABLE_ROLES.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className={labelClass}>Status</span>
            <select
              value={form.status}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  status: event.target.value as 'ACTIVE' | 'INACTIVE',
                }))
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
              onClick={resetForm}
              className="min-h-12 rounded-xl border border-border px-6 text-sm font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="min-h-12 rounded-xl bg-accent px-8 text-base font-bold text-white disabled:opacity-70"
            >
              {saving
                ? 'Saving…'
                : editingId
                  ? title === 'Workers'
                    ? 'Update Worker'
                    : 'Update User'
                  : title === 'Workers'
                    ? 'Create Worker'
                    : 'Create User'}
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

      {!showForm ? (
      <section className="overflow-hidden rounded-2xl border border-border bg-surface-raised">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-surface-muted text-xs font-bold uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted">
                    No users yet.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="border-t border-border">
                    <td className="px-4 py-3 font-semibold">{user.employeeCode}</td>
                    <td className="px-4 py-3">{user.name}</td>
                    <td className="px-4 py-3">{user.phone}</td>
                    <td className="px-4 py-3">{roleLabel(user.role)}</td>
                    <td className="px-4 py-3">{user.status === 'ACTIVE' ? 'Active' : 'Inactive'}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(user)}
                          className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:border-accent hover:text-accent"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(user)}
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
      ) : null}
    </div>
  )
}
