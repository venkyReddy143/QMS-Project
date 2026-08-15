import 'dotenv/config'
import mongoose from 'mongoose'
import { connectDB } from './config/db'
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
]

async function seed() {
  await connectDB()

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
      console.log(`Updated ${account.employeeCode} (${account.role})`)
      continue
    }

    await User.create(account)
    console.log(`Created ${account.employeeCode} (${account.role})`)
  }

  await mongoose.disconnect()
  console.log('Seed complete.')
}

seed().catch(async (error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown error'
  console.error('Seed failed:', message)
  await mongoose.disconnect().catch(() => undefined)
  process.exit(1)
})
