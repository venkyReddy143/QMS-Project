import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useOrders } from '../context/OrdersContext'

function statusClass(status: string): string {
  if (status === 'In Production') return 'bg-sky-100 text-sky-800'
  if (status === 'Ready to Dispatch') return 'bg-emerald-100 text-emerald-800'
  if (status === 'Created') return 'bg-violet-100 text-violet-800'
  if (status === 'On Hold') return 'bg-red-100 text-danger'
  return 'bg-amber-100 text-amber-800'
}

export function OrdersList() {
  const { orders } = useOrders()
  const navigate = useNavigate()

  const stats = useMemo(() => {
    return {
      open: orders.length,
      inProduction: orders.filter((order) => order.status === 'In Production').length,
      ready: orders.filter((order) => order.status === 'Ready to Dispatch').length,
    }
  }, [orders])

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-border bg-surface-raised p-5">
        <h2 className="text-2xl font-bold text-foreground">Orders List</h2>
        <p className="mt-1 text-base text-muted">
          Open an order to start production, create shared batches, and track
          serial progress across shifts.
        </p>
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
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-base">
            <thead className="bg-surface-muted text-sm font-bold uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Order ID</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Qty</th>
                <th className="px-4 py-3">Due Date</th>
                <th className="px-4 py-3">Batches / Progress</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const serials = order.batches.flatMap((batch) => batch.serials)
                const completed = serials.filter((s) => s.status === 'Completed').length
                const disputed = serials.filter((s) => s.status === 'Disputed').length
                const progressLabel =
                  order.batches.length === 0
                    ? 'No batches yet'
                    : `${order.batches.length} batches · ${completed}/${serials.length} done${
                        disputed > 0 ? ` · ${disputed} disputed` : ''
                      }`

                return (
                  <tr key={order.id} className="border-t border-border">
                    <td className="px-4 py-3 font-bold text-accent">{order.id}</td>
                    <td className="px-4 py-3">{order.customer}</td>
                    <td className="px-4 py-3">{order.product}</td>
                    <td className="px-4 py-3 font-semibold">{order.qty}</td>
                    <td className="px-4 py-3">{order.dueDate}</td>
                    <td className="px-4 py-3 text-sm font-semibold">{progressLabel}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-sm font-bold ${statusClass(order.status)}`}
                      >
                        {order.status}
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
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

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
    </div>
  )
}
