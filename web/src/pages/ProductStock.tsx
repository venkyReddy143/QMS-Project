import { Fragment, useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import {
  createStockEntryApi,
  fetchAdminProductsApi,
  fetchInventoryApi,
} from '../lib/api/admin'
import { fetchEmployeesApi } from '../lib/api/batches'
import type { AdminProduct, InventoryProduct, StockTransferType } from '../types/admin'
import { STOCK_TRANSFER_OPTIONS } from '../types/admin'
import type { EmployeeOption } from '../types/orders'

const fieldClass =
  'min-h-12 w-full rounded-xl border border-border bg-surface-muted px-3 text-base text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/20'

const labelClass = 'block text-sm font-bold text-foreground'

function serialStatusLabel(status: string) {
  return status
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function ProductStock({
  mode,
}: {
  mode: 'inventory' | 'issue' | 'receipt'
}) {
  const navigate = useNavigate()
  const title =
    mode === 'inventory' ? 'Inventory' : mode === 'issue' ? 'Issue' : 'Receipt'
  const description =
    mode === 'inventory'
      ? 'On-hand quantity by product. Expand serial-controlled items for serial detail.'
      : mode === 'issue'
        ? 'Move stock between store, operator, vendor, dispose, or missing.'
        : 'Receive stock into inventory.'

  return (
    <div className="space-y-4">
      <section className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-border bg-surface-raised p-5">
        <div>
          <h2 className="text-2xl font-bold text-foreground">{title}</h2>
          <p className="mt-1 text-base text-muted">{description}</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/masters/products')}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border px-4 text-sm font-bold hover:border-accent"
        >
          <ArrowLeft className="h-4 w-4" />
          Products
        </button>
      </section>
      {mode === 'inventory' ? <InventoryPanel /> : <StockEntryForm entryType={mode === 'issue' ? 'ISSUE' : 'RECEIPT'} />}
    </div>
  )
}

function InventoryPanel() {
  const [rows, setRows] = useState<InventoryProduct[]>([])
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    void fetchInventoryApi()
      .then((response) => setRows(response.inventory ?? []))
      .catch((loadError: unknown) =>
        setError(
          loadError instanceof Error ? loadError.message : 'Failed to load inventory.',
        ),
      )
  }, [])

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-surface-raised">
      {error ? (
        <p className="px-4 py-4 text-sm font-medium text-danger">{error}</p>
      ) : null}
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-surface-muted text-xs font-bold uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Serial</th>
              <th className="px-4 py-3">On hand</th>
              <th className="px-4 py-3">UOM</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted">
                  No products yet.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const expanded = expandedId === row.productId
                return (
                  <Fragment key={row.productId}>
                    <tr
                      key={row.productId}
                      className={`border-t border-border ${
                        row.isSerialControl
                          ? 'cursor-pointer hover:bg-surface-muted/60'
                          : ''
                      }`}
                      onClick={() => {
                        if (!row.isSerialControl) return
                        setExpandedId(expanded ? null : row.productId)
                      }}
                    >
                      <td className="px-4 py-3 font-semibold">{row.productCode}</td>
                      <td className="px-4 py-3">{row.name}</td>
                      <td className="px-4 py-3">{row.productType}</td>
                      <td className="px-4 py-3">
                        {row.isSerialControl ? 'Yes' : 'No'}
                      </td>
                      <td className="px-4 py-3 font-bold">{row.onHandQty}</td>
                      <td className="px-4 py-3">{row.uom}</td>
                    </tr>
                    {expanded ? (
                      <tr key={`${row.productId}-serials`} className="border-t border-border bg-surface-muted/40">
                        <td colSpan={6} className="px-6 py-3">
                          {row.serials.length === 0 ? (
                            <p className="text-sm text-muted">No serial numbers in stock.</p>
                          ) : (
                            <table className="min-w-full text-left text-sm">
                              <thead>
                                <tr className="text-xs font-bold uppercase tracking-wide text-muted">
                                  <th className="py-2 pr-4">Serial number</th>
                                  <th className="py-2 pr-4">Status</th>
                                  <th className="py-2">Holder</th>
                                </tr>
                              </thead>
                              <tbody>
                                {row.serials.map((serial) => (
                                  <tr key={serial.serialNumber}>
                                    <td className="py-1.5 pr-4 font-semibold">
                                      {serial.serialNumber}
                                    </td>
                                    <td className="py-1.5 pr-4">
                                      {serialStatusLabel(serial.status)}
                                    </td>
                                    <td className="py-1.5">{serial.holderName || '—'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
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
  )
}

function StockEntryForm({ entryType }: { entryType: 'ISSUE' | 'RECEIPT' }) {
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [inventory, setInventory] = useState<InventoryProduct[]>([])
  const [people, setPeople] = useState<EmployeeOption[]>([])
  const [productId, setProductId] = useState('')
  const [serialNumber, setSerialNumber] = useState('')
  const [quantity, setQuantity] = useState('')
  const [transferType, setTransferType] = useState<StockTransferType>('STORE_TO_OPERATOR')
  const [fromPersonId, setFromPersonId] = useState('')
  const [toPersonId, setToPersonId] = useState('')
  const [remarks, setRemarks] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    void Promise.all([
      fetchAdminProductsApi(),
      fetchInventoryApi(),
      fetchEmployeesApi(),
    ])
      .then(([productRes, inventoryRes, peopleRes]) => {
        const nextProducts = productRes.products ?? []
        setProducts(nextProducts)
        setInventory(inventoryRes.inventory ?? [])
        setPeople(peopleRes.employees ?? [])
        if (!productId && nextProducts[0]) setProductId(nextProducts[0].id)
      })
      .catch((loadError: unknown) =>
        setError(
          loadError instanceof Error ? loadError.message : 'Failed to load form data.',
        ),
      )
  }, [])

  const selected = products.find((item) => item.id === productId)
  const isSerial = Boolean(selected?.isSerialControl)
  const stockRow = inventory.find((item) => item.productId === productId)
  const personLabel = (person: EmployeeOption) =>
    `${person.name} (${person.employeeCode})`

  const serialOptions = useMemo(() => {
    if (!isSerial) return []
    const serials = stockRow?.serials ?? []
    if (entryType === 'RECEIPT') return []
    return serials
  }, [entryType, isSerial, stockRow])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setMessage(null)
    if (!productId) {
      setError('Select a product.')
      return
    }
    const fromPerson = people.find((item) => item.id === fromPersonId)
    const toPerson = people.find((item) => item.id === toPersonId)
    if (!fromPerson || !toPerson) {
      setError('Select issue from person and issue to person.')
      return
    }
    if (isSerial && !serialNumber.trim()) {
      setError('Serial number is required.')
      return
    }
    if (!isSerial) {
      const qty = Number(quantity)
      if (!Number.isInteger(qty) || qty < 1) {
        setError('Quantity must be a whole number of at least 1.')
        return
      }
    }

    setSaving(true)
    try {
      const response = await createStockEntryApi({
        entryType,
        productId,
        serialNumber: isSerial ? serialNumber.trim() : undefined,
        quantity: isSerial ? undefined : Number(quantity),
        transferType,
        fromPersonId: fromPerson.id,
        fromPersonName: fromPerson.name,
        toPersonId: toPerson.id,
        toPersonName: toPerson.name,
        remarks: remarks.trim(),
      })
      if (!response.success) {
        setError(response.message || 'Failed to save.')
        return
      }
      setMessage(response.message)
      setSerialNumber('')
      setQuantity('')
      setRemarks('')
      const inventoryRes = await fetchInventoryApi()
      setInventory(inventoryRes.inventory ?? [])
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
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
      <section className="rounded-2xl border border-border bg-surface-raised p-5">
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className={labelClass}>Product</span>
            <select
              value={productId}
              onChange={(event) => {
                setProductId(event.target.value)
                setSerialNumber('')
                setQuantity('')
              }}
              className={fieldClass}
              required
            >
              <option value="">Select product</option>
              {products.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.productCode} — {item.name}
                </option>
              ))}
            </select>
          </label>
          {isSerial ? (
            entryType === 'ISSUE' ? (
              <label className="block space-y-1.5">
                <span className={labelClass}>Serial number</span>
                <select
                  value={serialNumber}
                  onChange={(event) => setSerialNumber(event.target.value)}
                  className={fieldClass}
                  required
                >
                  <option value="">Select serial</option>
                  {serialOptions.map((item) => (
                    <option key={item.serialNumber} value={item.serialNumber}>
                      {item.serialNumber} ({serialStatusLabel(item.status)})
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <label className="block space-y-1.5">
                <span className={labelClass}>Serial number</span>
                <input
                  value={serialNumber}
                  onChange={(event) => setSerialNumber(event.target.value)}
                  className={fieldClass}
                  required
                />
              </label>
            )
          ) : (
            <label className="block space-y-1.5">
              <span className={labelClass}>Qty</span>
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                className={fieldClass}
                required
              />
              <p className="text-sm text-muted">
                On hand: {stockRow?.onHandQty ?? 0} {selected?.uom || 'PCS'}
              </p>
            </label>
          )}
          <label className="block space-y-1.5">
            <span className={labelClass}>Issue from person</span>
            <select
              value={fromPersonId}
              onChange={(event) => setFromPersonId(event.target.value)}
              className={fieldClass}
              required
            >
              <option value="">Select person</option>
              {people.map((person) => (
                <option key={person.id} value={person.id}>
                  {personLabel(person)}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className={labelClass}>Issue to person</span>
            <select
              value={toPersonId}
              onChange={(event) => setToPersonId(event.target.value)}
              className={fieldClass}
              required
            >
              <option value="">Select person</option>
              {people.map((person) => (
                <option key={person.id} value={person.id}>
                  {personLabel(person)}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1.5 sm:col-span-2">
            <span className={labelClass}>Transfer</span>
            <select
              value={transferType}
              onChange={(event) =>
                setTransferType(event.target.value as StockTransferType)
              }
              className={fieldClass}
            >
              {STOCK_TRANSFER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1.5 sm:col-span-2">
            <span className={labelClass}>Remarks</span>
            <textarea
              value={remarks}
              onChange={(event) => setRemarks(event.target.value)}
              className={`${fieldClass} min-h-24 py-3`}
            />
          </label>
          <div className="sm:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="min-h-12 rounded-xl bg-accent px-8 text-base font-bold text-white disabled:opacity-70"
            >
              {saving
                ? 'Saving…'
                : entryType === 'ISSUE'
                  ? 'Save Issue'
                  : 'Save Receipt'}
            </button>
          </div>
        </form>
      </section>
    </>
  )
}
