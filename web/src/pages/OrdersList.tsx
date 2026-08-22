import { useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PlusCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { fetchOrders } from '../store/slices/ordersSlice'
import type { OrderProductLine } from '../types/orders'

function statusLabel(status: string): string {
  switch (status) {
    case 'DRAFT':
      return 'Draft'
    case 'RELEASED':
      return 'Created'
    case 'IN_PRODUCTION':
    case 'PARTIALLY_COMPLETED':
      return 'In Production'
    case 'COMPLETED':
      return 'Ready to Dispatch'
    case 'ON_HOLD':
      return 'On Hold'
    case 'CANCELLED':
      return 'Cancelled'
    default:
      return status
  }
}

function statusClass(status: string): string {
  const label = statusLabel(status)
  if (label === 'In Production') return 'bg-sky-100 text-sky-800'
  if (label === 'Ready to Dispatch') return 'bg-emerald-100 text-emerald-800'
  if (label === 'Created' || label === 'Draft') return 'bg-violet-100 text-violet-800'
  if (label === 'On Hold' || label === 'Cancelled') return 'bg-red-100 text-danger'
  return 'bg-amber-100 text-amber-800'
}

function formatDueDate(value: string | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toISOString().slice(0, 10)
}

function productSummary(products: OrderProductLine[] | undefined, fallback: string) {
  if (!products || products.length === 0) return fallback || '—'
  return products
    .map((line) => `${line.productName} (${line.quantity})`)
    .join(', ')
}

export function OrdersList() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { user } = useAuth()
  const canCreate = user?.role === 'Order Creator'
  const orders = useAppSelector((state) => state.orders.items)
  const listStatus = useAppSelector((state) => state.orders.listStatus)
  const listError = useAppSelector((state) => state.orders.listError)

  useEffect(() => {
    void dispatch(fetchOrders())
  }, [dispatch])

  const stats = useMemo(() => {
    return {
      open: orders.filter((order) => order.status !== 'CANCELLED').length,
      inProduction: orders.filter(
        (order) =>
          order.status === 'IN_PRODUCTION' ||
          order.status === 'PARTIALLY_COMPLETED',
      ).length,
      ready: orders.filter((order) => order.status === 'COMPLETED').length,
    }
  }, [orders])

  return (
    <div className="space-y-4">
      <section className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-border bg-surface-raised p-5">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Orders</h2>
          <p className="mt-1 text-base text-muted">
            {canCreate
              ? 'Review existing orders or create a new manufacturing order.'
              : 'Open an order to add customer, machine, and process steps.'}
          </p>
        </div>
        {canCreate ? (
          <button
            type="button"
            onClick={() => navigate('/create-order')}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-bold text-white hover:brightness-110"
          >
            <PlusCircle className="h-4 w-4" />
            Create New Order
          </button>
        ) : null}
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-surface-raised p-4">
          <p className="text-sm font-semibold text-muted">Open Orders</p>
          <p className="mt-1 text-3xl font-bold text-foreground">{stats.open}</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface-raised p-4">
          <p className="text-sm font-semibold text-muted">In Production</p>
          <p className="mt-1 text-3xl font-bold text-accent">{stats.inProduction}</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface-raised p-4">
          <p className="text-sm font-semibold text-muted">Ready to Dispatch</p>
          <p className="mt-1 text-3xl font-bold text-success">{stats.ready}</p>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-border bg-surface-raised">
        {listError ? (
          <p className="px-4 py-4 text-sm font-medium text-danger">{listError}</p>
        ) : null}
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-base">
            <thead className="bg-surface-muted text-sm font-bold uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Order ID</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Products</th>
                <th className="px-4 py-3">Qty</th>
                <th className="px-4 py-3">Due Date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {listStatus === 'loading' ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted">
                    Loading orders…
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted">
                    No orders found.
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="border-t border-border">
                    <td className="px-4 py-3 font-bold text-accent">
                      {order.orderNo}
                    </td>
                    <td className="px-4 py-3">
                      {order.customerName || '—'}
                    </td>
                    <td className="px-4 py-3">
                      {productSummary(order.products, order.productName)}
                    </td>
                    <td className="px-4 py-3 font-semibold">
                      {order.totalQuantity}
                    </td>
                    <td className="px-4 py-3">{formatDueDate(order.dueDate)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-sm font-bold ${statusClass(order.status)}`}
                      >
                        {statusLabel(order.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => navigate(`/orders/${order.id}`)}
                        className="min-h-10 rounded-xl border border-border bg-surface-muted px-4 text-sm font-bold hover:border-accent hover:text-accent"
                      >
                        Open
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {user?.role !== 'Order Creator' ? (
        <p className="text-sm text-muted">
          Tip: after opening an order and creating batches, use{' '}
          <Link to="/production-planning" className="font-semibold text-accent">
            Shift Work Update
          </Link>{' '}
          to log piece progress by shift. Progress disputes go to{' '}
          <Link to="/my-tasks" className="font-semibold text-accent">
            Manager Reviews
          </Link>
          .
        </p>
      ) : null}
    </div>
  )
}
