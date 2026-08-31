import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ClipboardList,
  Cog,
  Factory,
  PlusCircle,
  Users,
} from 'lucide-react'
import { fetchAdminSummaryApi } from '../lib/api/admin'
import type { AdminSummary } from '../types/admin'

const EMPTY_SUMMARY: AdminSummary = {
  users: 0,
  machines: 0,
  products: 0,
  processSteps: 0,
  customers: 0,
  orders: 0,
}

export function SuperAdminDashboard() {
  const [summary, setSummary] = useState<AdminSummary>(EMPTY_SUMMARY)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const response = await fetchAdminSummaryApi()
        if (!active) return
        if (response.summary) setSummary(response.summary)
      } catch (loadError) {
        if (!active) return
        setError(
          loadError instanceof Error ? loadError.message : 'Failed to load dashboard.',
        )
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [])

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-border bg-surface-raised p-5">
        <h2 className="text-2xl font-bold text-foreground">Super Admin Dashboard</h2>
        <p className="mt-1 text-base text-muted">
          Manage users, masters, and all production features from one place.
        </p>
      </section>

      {error ? (
        <div className="rounded-xl border border-danger/30 bg-red-50 px-4 py-3 text-sm font-medium text-danger">
          {error}
        </div>
      ) : null}

      <section className="grid grid-cols-6 gap-3">
        <StatCard label="Users" value={summary.users} to="/masters/workers" />
        <StatCard label="Machines" value={summary.machines} to="/masters/machines" />
        <StatCard label="Products" value={summary.products} to="/masters/products" />
        <StatCard
          label="Process Steps"
          value={summary.processSteps}
          to="/masters/process-steps"
        />
        <StatCard label="Customers" value={summary.customers} to="/masters/customers" />
        <StatCard label="Orders" value={summary.orders} to="/order/orders/all" />
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <QuickLink
          to="/masters/workers"
          icon={Users}
          title="Workers"
          description="Create workers and assign Order Creator, Production Manager, Floor Manager, or Super Admin."
        />
        <QuickLink
          to="/masters/machines"
          icon={Cog}
          title="Masters"
          description="Manage products, machine types, machines, calendars, and workers."
        />
        <QuickLink
          to="/order/orders/all"
          icon={ClipboardList}
          title="Orders"
          description="Open any order to review planning, batches, and serial numbers."
        />
        <QuickLink
          to="/create-order"
          icon={PlusCircle}
          title="Create Order"
          description="Raise a new manufacturing order with products and quantities."
        />
        <QuickLink
          to="/production-planning"
          icon={Factory}
          title="Shift Work Update"
          description="Log serial progress across batches."
        />
        <QuickLink
          to="/my-tasks"
          icon={ClipboardList}
          title="Manager Reviews"
          description="Review and resolve progress disputes."
        />
      </section>
    </div>
  )
}

function StatCard({
  label,
  value,
  to,
}: {
  label: string
  value: number
  to: string
}) {
  return (
    <Link
      to={to}
      className="min-w-0 rounded-2xl border border-border bg-surface-raised p-4 transition hover:border-accent"
    >
      <p className="text-sm font-bold text-muted">{label}</p>
      <p className="mt-2 text-2xl font-bold text-foreground">{value}</p>
    </Link>
  )
}

function QuickLink({
  to,
  icon: Icon,
  title,
  description,
}: {
  to: string
  icon: typeof Users
  title: string
  description: string
}) {
  return (
    <Link
      to={to}
      className="flex gap-3 rounded-2xl border border-border bg-surface-raised p-5 transition hover:border-accent"
    >
      <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
        <Icon className="h-5 w-5" />
      </span>
      <span>
        <span className="block text-base font-bold text-foreground">{title}</span>
        <span className="mt-1 block text-sm text-muted">{description}</span>
      </span>
    </Link>
  )
}
