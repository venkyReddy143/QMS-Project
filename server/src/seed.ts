import 'dotenv/config'
import mongoose from 'mongoose'
import { connectDB } from './config/db'
import { Customer } from './models/Customer'
import { ProcessRoute } from './models/ProcessRoute'
import { ProcessStep } from './models/ProcessStep'
import { Product } from './models/Product'
import { User, type IUser } from './models/User'

type SeedUser = Omit<IUser, 'createdAt' | 'updatedAt'>

const DEMO_USERS: SeedUser[] = [
  {
    employeeCode: 'EMP-0041',
    name: 'Meera Joshi',
    email: 'meera.joshi@example.com',
    phone: '9876543210',
    password: 'order123',
    role: 'MANAGER',
    status: 'ACTIVE',
  },
  {
    employeeCode: 'EMP-0042',
    name: 'R. Kumar',
    email: 'rkumar@example.com',
    phone: '9988776655',
    password: 'floor123',
    role: 'SHOP_FLOOR_OPERATOR',
    status: 'ACTIVE',
  },
  {
    employeeCode: 'EMP-0043',
    name: 'Ananya Mehta',
    email: 'ananya.mehta@example.com',
    phone: '9123456780',
    password: 'prod123',
    role: 'SUPERVISOR',
    status: 'ACTIVE',
  },
  {
    employeeCode: 'EMP-0100',
    name: 'Plant Manager',
    email: 'manager@qms.local',
    phone: '7780291842',
    password: 'manager@123',
    role: 'MANAGER',
    status: 'ACTIVE',
  },
]

const CUSTOMERS = [
  'AeroDyn Turbines Ltd.',
  'Prime Aero Components',
  'NorthWind Energy',
  'Orbit Precision Castings',
  'Helix Power Systems',
]

const PROCESS_STEPS = [
  {
    code: 'CASTING',
    name: 'Casting',
    category: 'Casting',
    standardHoursPerPiece: 0.45,
    requiresQualityRelease: false,
  },
  {
    code: 'CNC',
    name: 'CNC Machining',
    category: 'CNC',
    standardHoursPerPiece: 2.5,
    requiresQualityRelease: false,
  },
  {
    code: 'COATING',
    name: 'Coating',
    category: 'Coating',
    standardHoursPerPiece: 0.8,
    requiresQualityRelease: false,
  },
  {
    code: 'NDT',
    name: 'NDT Testing',
    category: 'NDT',
    standardHoursPerPiece: 0.3,
    requiresQualityRelease: true,
  },
  {
    code: 'FINAL_INSPECTION',
    name: 'Final Inspection',
    category: 'Final Inspection',
    standardHoursPerPiece: 0.2,
    requiresQualityRelease: true,
  },
  {
    code: 'PACKING',
    name: 'Packing',
    category: 'Packing',
    standardHoursPerPiece: 0.15,
    requiresQualityRelease: false,
  },
]

const PRODUCTS = [
  {
    productCode: 'TB-HP-001',
    name: 'HP Stage-1 Rotor Blade',
    description: '500 HP Stage-1 Rotor Blades',
    unitRate: 18500,
    stepCodes: ['CASTING', 'CNC', 'COATING', 'NDT', 'FINAL_INSPECTION', 'PACKING'],
  },
  {
    productCode: 'TB-LP-002',
    name: 'LP Stage-2 Stator Vane',
    description: 'LP Stage-2 Stator Vane',
    unitRate: 14200,
    stepCodes: ['CASTING', 'CNC', 'NDT', 'FINAL_INSPECTION', 'PACKING'],
  },
  {
    productCode: 'TB-CB-003',
    name: 'Compressor Blade Set',
    description: 'Compressor Blade Set',
    unitRate: 9800,
    stepCodes: ['CNC', 'COATING', 'NDT', 'FINAL_INSPECTION', 'PACKING'],
  },
]

async function upsertUsers() {
  for (const account of DEMO_USERS) {
    const existing = await User.findOne({
      $or: [
        { employeeCode: account.employeeCode },
        { phone: account.phone },
        { email: account.email },
      ],
    }).select('+password')

    if (existing) {
      existing.employeeCode = account.employeeCode
      existing.name = account.name
      existing.email = account.email
      existing.phone = account.phone
      existing.role = account.role
      existing.status = account.status
      existing.password = account.password
      await existing.save()
      console.log(`Updated user ${account.employeeCode}`)
      continue
    }

    await User.create(account)
    console.log(`Created user ${account.employeeCode}`)
  }
}

async function upsertCustomers() {
  for (const name of CUSTOMERS) {
    await Customer.findOneAndUpdate(
      { name },
      { name, status: 'ACTIVE' },
      { upsert: true, new: true },
    )
  }
  console.log(`Upserted ${CUSTOMERS.length} customers`)
}

async function upsertProcessSteps() {
  for (const step of PROCESS_STEPS) {
    await ProcessStep.findOneAndUpdate(
      { code: step.code },
      { ...step, status: 'ACTIVE' },
      { upsert: true, new: true },
    )
  }
  console.log(`Upserted ${PROCESS_STEPS.length} process steps`)
}

async function upsertProductsAndRoutes() {
  const steps = await ProcessStep.find({ status: 'ACTIVE' })
  const stepByCode = new Map(steps.map((step) => [step.code, step]))

  for (const item of PRODUCTS) {
    const product = await Product.findOneAndUpdate(
      { productCode: item.productCode },
      {
        productCode: item.productCode,
        name: item.name,
        description: item.description,
        uom: 'PCS',
        revision: 'REV-A',
        productType: 'PRODUCT',
        unitRate: item.unitRate,
        status: 'ACTIVE',
      },
      { upsert: true, new: true },
    )

    const routeSteps = item.stepCodes.map((code, index) => {
      const step = stepByCode.get(code)
      if (!step) {
        throw new Error(`Missing process step ${code}`)
      }

      return {
        processStepId: step._id,
        sequence: index + 1,
        standardHoursPerPiece: step.standardHoursPerPiece,
      }
    })

    await ProcessRoute.findOneAndUpdate(
      { productId: product._id, version: 1 },
      {
        productId: product._id,
        routeCode: `ROUTE-${item.productCode}`,
        version: 1,
        steps: routeSteps,
        status: 'ACTIVE',
        effectiveFrom: new Date('2026-08-01T00:00:00.000Z'),
      },
      { upsert: true, new: true },
    )

    console.log(`Upserted product ${item.productCode}`)
  }
}

async function seed() {
  await connectDB()
  await upsertUsers()
  await upsertCustomers()
  await upsertProcessSteps()
  await upsertProductsAndRoutes()
  await mongoose.disconnect()
  console.log('Seed complete.')
}

seed().catch(async (error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown error'
  console.error('Seed failed:', message)
  await mongoose.disconnect().catch(() => undefined)
  process.exit(1)
})
