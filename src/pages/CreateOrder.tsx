import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { CheckCircle2, PlusCircle, Trash2 } from 'lucide-react'

const CUSTOMERS = [
  'AeroDyn Turbines Ltd.',
  'Prime Aero Components',
  'NorthWind Energy',
  'Orbit Precision Castings',
  'Helix Power Systems',
]

const PRODUCTS = [
  'HP Stage-1 Rotor Blade',
  'LP Stage-2 Stator Vane',
  'Compressor Blade Set',
] as const

type ProductName = (typeof PRODUCTS)[number]
type Priority = 'Normal' | 'High' | 'Urgent'
type MachineOption = 'Casting' | 'CNC' | 'Coating' | 'NDT' | 'Final Inspection' | 'Packing'

const MACHINE_OPTIONS: MachineOption[] = [
  'Casting',
  'CNC',
  'Coating',
  'NDT',
  'Final Inspection',
  'Packing',
]

const PROCESS_BY_PRODUCT: Record<
  ProductName,
  { name: string; hours: number }[]
> = {
  'HP Stage-1 Rotor Blade': [
    { name: 'Casting', hours: 0.45 },
    { name: 'CNC Machining', hours: 2.5 },
    { name: 'Coating', hours: 0.8 },
    { name: 'NDT Testing', hours: 0.3 },
    { name: 'Final Inspection', hours: 0.2 },
    { name: 'Packing', hours: 0.15 },
  ],
  'LP Stage-2 Stator Vane': [
    { name: 'Casting', hours: 0.4 },
    { name: 'CNC Machining', hours: 1.8 },
    { name: 'NDT Testing', hours: 0.25 },
    { name: 'Final Inspection', hours: 0.2 },
    { name: 'Packing', hours: 0.15 },
  ],
  'Compressor Blade Set': [
    { name: 'CNC Machining', hours: 1.2 },
    { name: 'Coating', hours: 0.6 },
    { name: 'NDT Testing', hours: 0.2 },
    { name: 'Final Inspection', hours: 0.15 },
    { name: 'Packing', hours: 0.1 },
  ],
}

interface ProcessStep {
  id: string
  name: string
  hours: number
  isCustom: boolean
}

function buildDefaultSteps(productName: ProductName): ProcessStep[] {
  return PROCESS_BY_PRODUCT[productName].map((step, index) => ({
    id: `default-${productName}-${index}-${step.name}`,
    name: step.name,
    hours: step.hours,
    isCustom: false,
  }))
}

const UNIT_RATE: Record<ProductName, number> = {
  'HP Stage-1 Rotor Blade': 18500,
  'LP Stage-2 Stator Vane': 14200,
  'Compressor Blade Set': 9800,
}

const fieldClass =
  'min-h-12 w-full rounded-xl border border-border bg-surface-muted px-3 text-base text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/20'

const labelClass = 'block text-sm font-bold text-foreground'

function SectionCard({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section className="rounded-2xl border border-border bg-surface-raised p-5">
      <h3 className="mb-4 border-b border-border pb-3 text-lg font-bold text-foreground">
        {title}
      </h3>
      <div className="space-y-4">{children}</div>
    </section>
  )
}

function formatInr(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value)
}

export function CreateOrder() {
  const [customer, setCustomer] = useState('')
  const [customerQuery, setCustomerQuery] = useState('')
  const [product, setProduct] = useState<ProductName>('HP Stage-1 Rotor Blade')
  const [poNumber, setPoNumber] = useState('')
  const [quantity, setQuantity] = useState('100')
  const [budget, setBudget] = useState('')
  const [estimationManual, setEstimationManual] = useState(false)
  const [estimationPrice, setEstimationPrice] = useState('')
  const [primaryMachine, setPrimaryMachine] = useState<MachineOption>('CNC')
  const [additionalMachines, setAdditionalMachines] = useState<MachineOption[]>([
    'Casting',
    'Coating',
  ])
  const [targetDate, setTargetDate] = useState('2026-09-30')
  const [priority, setPriority] = useState<Priority>('Normal')
  const [notes, setNotes] = useState('')
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null)
  const [processSteps, setProcessSteps] = useState<ProcessStep[]>(() =>
    buildDefaultSteps('HP Stage-1 Rotor Blade'),
  )
  const [newStepName, setNewStepName] = useState('')
  const [newStepHours, setNewStepHours] = useState('0.50')
  const [stepError, setStepError] = useState<string | null>(null)

  const filteredCustomers = useMemo(() => {
    const q = customerQuery.trim().toLowerCase()
    if (!q) return CUSTOMERS
    return CUSTOMERS.filter((name) => name.toLowerCase().includes(q))
  }, [customerQuery])

  const calculatedEstimate = useMemo(() => {
    const qty = Number(quantity) || 0
    return qty * UNIT_RATE[product]
  }, [product, quantity])

  const displayEstimate = estimationManual
    ? Number(estimationPrice) || 0
    : calculatedEstimate

  function applyProductDefaults(nextProduct: ProductName) {
    setProduct(nextProduct)
    setEstimationManual(false)
    setProcessSteps(buildDefaultSteps(nextProduct))
    setStepError(null)
  }

  function addCustomStep() {
    const name = newStepName.trim()
    const hours = Number(newStepHours)

    if (!name) {
      setStepError('Enter a step name.')
      return
    }
    if (!Number.isFinite(hours) || hours <= 0) {
      setStepError('Hours per piece must be greater than 0.')
      return
    }

    setProcessSteps((current) => [
      ...current,
      {
        id: `custom-${crypto.randomUUID()}`,
        name,
        hours,
        isCustom: true,
      },
    ])
    setNewStepName('')
    setNewStepHours('0.50')
    setStepError(null)
  }

  function removeStep(id: string) {
    setProcessSteps((current) => current.filter((step) => step.id !== id))
  }

  function toggleAdditionalMachine(machine: MachineOption) {
    setAdditionalMachines((current) =>
      current.includes(machine)
        ? current.filter((item) => item !== machine)
        : [...current, machine],
    )
  }

  function resetForm() {
    setCustomer('')
    setCustomerQuery('')
    setProduct('HP Stage-1 Rotor Blade')
    setPoNumber('')
    setQuantity('100')
    setBudget('')
    setEstimationManual(false)
    setEstimationPrice('')
    setPrimaryMachine('CNC')
    setAdditionalMachines(['Casting', 'Coating'])
    setTargetDate('2026-09-30')
    setPriority('Normal')
    setNotes('')
    setCreatedOrderId(null)
    setProcessSteps(buildDefaultSteps('HP Stage-1 Rotor Blade'))
    setNewStepName('')
    setNewStepHours('0.50')
    setStepError(null)
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!customer) return

    const year = new Date().getFullYear()
    const seq = String(Math.floor(Math.random() * 9000) + 1000)
    setCreatedOrderId(`MO-${year}-${seq}`)
  }

  if (createdOrderId) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl border border-success/30 bg-emerald-50 p-6 text-center sm:p-8">
          <CheckCircle2 className="mx-auto h-14 w-14 text-success" />
          <h2 className="mt-4 text-2xl font-bold text-foreground">
            Order Created Successfully
          </h2>
          <p className="mt-2 text-base text-muted">
            The manufacturing order has been registered in the system.
          </p>
          <div className="mt-5 rounded-xl border border-border bg-surface-raised px-4 py-4">
            <p className="text-sm font-semibold text-muted">Order ID</p>
            <p className="mt-1 font-mono text-2xl font-bold text-accent">
              {createdOrderId}
            </p>
            <p className="mt-2 text-sm text-muted">
              {customer} · {product} · {quantity} pcs
            </p>
          </div>
          <button
            type="button"
            onClick={resetForm}
            className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-xl bg-accent px-6 text-base font-bold text-white hover:brightness-110"
          >
            <PlusCircle className="h-5 w-5" />
            Create Another Order
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <section className="rounded-2xl border border-border bg-surface-raised p-5">
        <h2 className="text-2xl font-bold text-foreground">Create Order</h2>
        <p className="mt-1 text-base text-muted">
          Inquiry Coordinator / Estimation Engineer — register a new manufacturing
          order.
        </p>
      </section>

      <form onSubmit={handleSubmit} className="space-y-4">
        <SectionCard title="1. Order Basics">
          <label className="block space-y-1.5">
            <span className={labelClass}>Customer Name</span>
            <input
              list="customer-options"
              value={customer || customerQuery}
              onChange={(event) => {
                const value = event.target.value
                setCustomerQuery(value)
                setCustomer(CUSTOMERS.includes(value) ? value : '')
              }}
              onBlur={() => {
                if (CUSTOMERS.includes(customerQuery)) {
                  setCustomer(customerQuery)
                }
              }}
              placeholder="Search or select customer"
              required
              className={fieldClass}
            />
            <datalist id="customer-options">
              {filteredCustomers.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
            {!customer && customerQuery ? (
              <p className="text-sm text-warning">
                Select a customer from the list.
              </p>
            ) : null}
          </label>

          <label className="block space-y-1.5">
            <span className={labelClass}>Product Name</span>
            <select
              value={product}
              onChange={(event) =>
                applyProductDefaults(event.target.value as ProductName)
              }
              className={fieldClass}
            >
              {PRODUCTS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1.5">
            <span className={labelClass}>Order Reference / PO Number</span>
            <input
              value={poNumber}
              onChange={(event) => setPoNumber(event.target.value)}
              placeholder="e.g. PO-2026-0041 or CUST-REF-8891"
              required
              className={fieldClass}
            />
          </label>
        </SectionCard>

        <SectionCard title="2. Quantity & Budget">
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block space-y-1.5">
              <span className={labelClass}>Total Quantity</span>
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                required
                className={fieldClass}
              />
            </label>

            <label className="block space-y-1.5">
              <span className={labelClass}>Budget (Estimated Cost)</span>
              <input
                type="number"
                min={0}
                value={budget}
                onChange={(event) => setBudget(event.target.value)}
                placeholder="Customer budget"
                className={fieldClass}
              />
            </label>

            <label className="block space-y-1.5">
              <span className={labelClass}>Estimation Price</span>
              <input
                type="number"
                min={0}
                value={
                  estimationManual ? estimationPrice : String(calculatedEstimate)
                }
                onChange={(event) => {
                  setEstimationManual(true)
                  setEstimationPrice(event.target.value)
                }}
                className={fieldClass}
              />
              <button
                type="button"
                onClick={() => {
                  setEstimationManual(false)
                  setEstimationPrice('')
                }}
                className="text-sm font-semibold text-accent hover:underline"
              >
                Recalculate from product rate
              </button>
            </label>
          </div>

          <div className="rounded-xl border border-border bg-surface-muted px-4 py-3 text-sm">
            <p className="font-semibold text-foreground">
              Current estimate: {formatInr(displayEstimate)}
            </p>
            <p className="mt-1 text-muted">
              Rate used: {formatInr(UNIT_RATE[product])} / pc
              {budget
                ? ` · Budget vs estimate: ${
                    Number(budget) >= displayEstimate ? 'Within budget' : 'Over budget'
                  }`
                : ''}
            </p>
          </div>
        </SectionCard>

        <SectionCard title="3. Machine & Process">
          <label className="block space-y-1.5">
            <span className={labelClass}>Primary Machine</span>
            <select
              value={primaryMachine}
              onChange={(event) =>
                setPrimaryMachine(event.target.value as MachineOption)
              }
              className={fieldClass}
            >
              {MACHINE_OPTIONS.map((machine) => (
                <option key={machine} value={machine}>
                  {machine}
                </option>
              ))}
            </select>
          </label>

          <div className="space-y-2">
            <span className={labelClass}>Additional Machines (optional)</span>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {MACHINE_OPTIONS.filter((machine) => machine !== primaryMachine).map(
                (machine) => {
                  const checked = additionalMachines.includes(machine)
                  return (
                    <label
                      key={machine}
                      className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-3 text-base font-semibold ${
                        checked
                          ? 'border-accent bg-accent-soft text-accent'
                          : 'border-border bg-surface-muted text-foreground'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleAdditionalMachine(machine)}
                        className="h-5 w-5 accent-teal-700"
                      />
                      {machine}
                    </label>
                  )
                },
              )}
            </div>
          </div>

          <div>
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <span className={labelClass}>Process Steps</span>
                <p className="mt-1 text-sm text-muted">
                  Default route from product. Add custom steps if needed (no limit).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setProcessSteps(buildDefaultSteps(product))}
                className="text-sm font-semibold text-accent hover:underline"
              >
                Reset to product defaults
              </button>
            </div>

            <ol className="mt-3 space-y-2">
              {processSteps.map((step, index) => (
                <li
                  key={step.id}
                  className="flex min-h-12 items-center gap-3 rounded-xl border border-border bg-surface-muted px-3 text-base"
                >
                  <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-white">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground">
                      {step.name}
                      {step.isCustom ? (
                        <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-warning">
                          Custom
                        </span>
                      ) : null}
                    </p>
                    <p className="text-sm text-muted">
                      {step.hours.toFixed(2)}h / pc
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeStep(step.id)}
                    className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg border border-border bg-surface-raised text-muted transition hover:border-danger hover:text-danger"
                    aria-label={`Remove ${step.name}`}
                    title="Remove step"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ol>

            <div className="mt-4 rounded-xl border border-dashed border-border bg-surface-muted/60 p-3">
              <p className="mb-2 text-sm font-bold text-foreground">
                Add Custom Process Step
              </p>
              <div className="grid gap-3 sm:grid-cols-[1fr_140px_auto]">
                <input
                  value={newStepName}
                  onChange={(event) => setNewStepName(event.target.value)}
                  placeholder="Step name (e.g. Heat Treatment)"
                  className={fieldClass}
                />
                <input
                  type="number"
                  min={0.01}
                  step={0.01}
                  value={newStepHours}
                  onChange={(event) => setNewStepHours(event.target.value)}
                  placeholder="Hours/pc"
                  className={fieldClass}
                />
                <button
                  type="button"
                  onClick={addCustomStep}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-foreground px-4 text-sm font-bold text-surface-raised hover:opacity-90"
                >
                  <PlusCircle className="h-4 w-4" />
                  Add Step
                </button>
              </div>
              {stepError ? (
                <p className="mt-2 text-sm font-semibold text-danger">{stepError}</p>
              ) : (
                <p className="mt-2 text-sm text-muted">
                  {processSteps.length} step{processSteps.length === 1 ? '' : 's'}{' '}
                  configured
                </p>
              )}
            </div>
          </div>
        </SectionCard>

        <SectionCard title="4. Schedule">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1.5">
              <span className={labelClass}>Target Completion Date</span>
              <input
                type="date"
                value={targetDate}
                onChange={(event) => setTargetDate(event.target.value)}
                required
                className={fieldClass}
              />
            </label>

            <label className="block space-y-1.5">
              <span className={labelClass}>Priority</span>
              <select
                value={priority}
                onChange={(event) => setPriority(event.target.value as Priority)}
                className={fieldClass}
              >
                <option value="Normal">Normal</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </label>
          </div>
        </SectionCard>

        <SectionCard title="5. Notes">
          <label className="block space-y-1.5">
            <span className={labelClass}>Internal Notes / Special Instructions</span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={4}
              placeholder="Drawing revision, packing notes, inspection requirements…"
              className="w-full rounded-xl border border-border bg-surface-muted px-3 py-3 text-base outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
          </label>
        </SectionCard>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={resetForm}
            className="min-h-12 rounded-xl border border-border bg-surface-raised px-6 text-base font-bold text-foreground hover:bg-surface-muted"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="min-h-12 rounded-xl bg-accent px-8 text-base font-bold text-white hover:brightness-110"
          >
            Create Order
          </button>
        </div>
      </form>
    </div>
  )
}
