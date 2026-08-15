const ORDERS = [
  {
    id: 'PO-2026-0041',
    customer: 'AeroDyn Turbines Ltd.',
    product: 'HP Stage-1 Rotor Blade',
    qty: 500,
    status: 'In Production',
    due: '2026-09-30',
  },
  {
    id: 'PO-2026-0038',
    customer: 'Prime Aero Components',
    product: 'Compressor Blade Set',
    qty: 120,
    status: 'Planned',
    due: '2026-09-12',
  },
  {
    id: 'PO-2026-0032',
    customer: 'NorthWind Energy',
    product: 'LP Stage-2 Stator Vane',
    qty: 80,
    status: 'Ready to Dispatch',
    due: '2026-08-28',
  },
]

function statusClass(status: string): string {
  if (status === 'In Production') return 'bg-sky-100 text-sky-800'
  if (status === 'Ready to Dispatch') return 'bg-emerald-100 text-emerald-800'
  return 'bg-amber-100 text-amber-800'
}

export function OrdersList() {
  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-border bg-surface-raised p-5">
        <h2 className="text-2xl font-bold text-foreground">Orders List</h2>
        <p className="mt-1 text-base text-muted">
          Track open manufacturing orders and delivery status.
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-surface-raised p-4">
          <p className="text-sm font-semibold text-muted">Open Orders</p>
          <p className="mt-1 text-3xl font-bold text-foreground">3</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface-raised p-4">
          <p className="text-sm font-semibold text-muted">In Production</p>
          <p className="mt-1 text-3xl font-bold text-accent">1</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface-raised p-4">
          <p className="text-sm font-semibold text-muted">Ready to Dispatch</p>
          <p className="mt-1 text-3xl font-bold text-success">1</p>
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
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {ORDERS.map((order) => (
                <tr key={order.id} className="border-t border-border">
                  <td className="px-4 py-3 font-bold text-accent">{order.id}</td>
                  <td className="px-4 py-3">{order.customer}</td>
                  <td className="px-4 py-3">{order.product}</td>
                  <td className="px-4 py-3 font-semibold">{order.qty}</td>
                  <td className="px-4 py-3">{order.due}</td>
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
                      className="min-h-10 rounded-xl border border-border bg-surface-muted px-4 text-sm font-bold hover:border-accent hover:text-accent"
                    >
                      Open
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
