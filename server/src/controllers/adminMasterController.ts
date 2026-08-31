import type { NextFunction, Request, Response } from 'express'
import {
  MACHINE_HEALTH_STATUSES,
  MACHINE_STATUSES,
  MASTER_STATUSES,
  PRODUCT_TYPES,
  type MachineHealthStatus,
  type MachineStatus,
  type MasterStatus,
  type ProductType,
} from '../constants/enums'
import { Customer } from '../models/Customer'
import { Machine } from '../models/Machine'
import { MachineType } from '../models/MachineType'
import { Calendar } from '../models/Calendar'
import { DeliveryBatch } from '../models/DeliveryBatch'
import { ProcessStep } from '../models/ProcessStep'
import { Product } from '../models/Product'
import { ProductionOrder } from '../models/ProductionOrder'
import { User } from '../models/User'

function isDuplicateKey(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code?: number }).code === 11000,
  )
}

function duplicateMessage(label: string) {
  return `${label} already exists.`
}

function toNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function mapMasterStatus(value: unknown): MasterStatus | undefined {
  const normalized = String(value ?? '').trim().toUpperCase()
  if (MASTER_STATUSES.includes(normalized as MasterStatus)) {
    return normalized as MasterStatus
  }
  return undefined
}

export async function adminSummary(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const [users, machines, products, processSteps, customers, orders] =
      await Promise.all([
        User.countDocuments(),
        Machine.countDocuments(),
        Product.countDocuments(),
        ProcessStep.countDocuments(),
        Customer.countDocuments(),
        ProductionOrder.countDocuments(),
      ])

    res.json({
      success: true,
      summary: {
        users,
        machines,
        products,
        processSteps,
        customers,
        orders,
      },
    })
  } catch (error) {
    next(error)
  }
}

function serializeMachine(machine: {
  _id: { toString(): string }
  machineCode: string
  name: string
  machineType: string
  bay?: string
  maxHoursPerShift: number
  status: string
  maintenanceStatus?: string
  active: boolean
}) {
  return {
    id: machine._id.toString(),
    machineCode: machine.machineCode,
    name: machine.name,
    machineType: machine.machineType,
    bay: machine.bay ?? '',
    maxHoursPerShift: machine.maxHoursPerShift,
    status: machine.status,
    maintenanceStatus: machine.maintenanceStatus ?? 'HEALTHY',
    active: machine.active,
  }
}

function serializeProduct(product: {
  _id: { toString(): string }
  productCode: string
  name: string
  description?: string
  uom: string
  revision?: string
  productType: string
  unitRate: number
  status: string
}) {
  return {
    id: product._id.toString(),
    productCode: product.productCode,
    name: product.name,
    description: product.description ?? '',
    uom: product.uom,
    revision: product.revision ?? '',
    productType: product.productType,
    unitRate: product.unitRate,
    status: product.status,
  }
}

function serializeProcessStep(step: {
  _id: { toString(): string }
  code: string
  name: string
  category: string
  standardHoursPerPiece: number
  requiresQualityRelease: boolean
  status: string
}) {
  return {
    id: step._id.toString(),
    code: step.code,
    name: step.name,
    category: step.category,
    standardHoursPerPiece: step.standardHoursPerPiece,
    requiresQualityRelease: step.requiresQualityRelease,
    status: step.status,
  }
}

function serializeCustomer(customer: {
  _id: { toString(): string }
  name: string
  status: string
}) {
  return {
    id: customer._id.toString(),
    name: customer.name,
    status: customer.status,
  }
}

export async function listAdminMachines(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const machines = await Machine.find().sort({ machineCode: 1 })
    res.json({
      success: true,
      machines: machines.map(serializeMachine),
    })
  } catch (error) {
    next(error)
  }
}

export async function createMachine(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const machineCode = String(req.body.machineCode ?? '').trim().toUpperCase()
    const name = String(req.body.name ?? '').trim()
    const machineType = String(req.body.machineType ?? '').trim()
    const maxHoursPerShift = toNumber(req.body.maxHoursPerShift) ?? 7.5

    if (!machineCode || !name || !machineType) {
      res.status(400).json({
        success: false,
        message: 'Machine code, name, and type are required.',
      })
      return
    }

    const statusRaw = String(req.body.status ?? 'AVAILABLE').trim().toUpperCase()
    const healthRaw = String(req.body.maintenanceStatus ?? 'HEALTHY')
      .trim()
      .toUpperCase()

    const machine = await Machine.create({
      machineCode,
      name,
      machineType,
      bay: String(req.body.bay ?? '').trim(),
      maxHoursPerShift,
      status: MACHINE_STATUSES.includes(statusRaw as MachineStatus)
        ? statusRaw
        : 'AVAILABLE',
      maintenanceStatus: MACHINE_HEALTH_STATUSES.includes(
        healthRaw as MachineHealthStatus,
      )
        ? healthRaw
        : 'HEALTHY',
      active: req.body.active !== false && req.body.active !== 'false',
    })

    res.status(201).json({
      success: true,
      message: 'Machine created.',
      machine: serializeMachine(machine),
    })
  } catch (error) {
    if (isDuplicateKey(error)) {
      res.status(409).json({
        success: false,
        message: duplicateMessage('Machine code'),
      })
      return
    }
    next(error)
  }
}

export async function updateMachine(
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
) {
  try {
    const machine = await Machine.findById(req.params.id)
    if (!machine) {
      res.status(404).json({ success: false, message: 'Machine not found.' })
      return
    }

    if (req.body.machineCode !== undefined) {
      machine.machineCode = String(req.body.machineCode).trim().toUpperCase()
    }
    if (req.body.name !== undefined) machine.name = String(req.body.name).trim()
    if (req.body.machineType !== undefined) {
      machine.machineType = String(req.body.machineType).trim()
    }
    if (req.body.bay !== undefined) machine.bay = String(req.body.bay).trim()
    if (req.body.maxHoursPerShift !== undefined) {
      const hours = toNumber(req.body.maxHoursPerShift)
      if (hours === undefined || hours < 0) {
        res.status(400).json({
          success: false,
          message: 'Max hours per shift cannot be negative.',
        })
        return
      }
      machine.maxHoursPerShift = hours
    }
    if (req.body.status !== undefined) {
      const status = String(req.body.status).trim().toUpperCase()
      if (!MACHINE_STATUSES.includes(status as MachineStatus)) {
        res.status(400).json({ success: false, message: 'Invalid machine status.' })
        return
      }
      machine.status = status as MachineStatus
    }
    if (req.body.maintenanceStatus !== undefined) {
      const health = String(req.body.maintenanceStatus).trim().toUpperCase()
      if (!MACHINE_HEALTH_STATUSES.includes(health as MachineHealthStatus)) {
        res.status(400).json({
          success: false,
          message: 'Invalid maintenance status.',
        })
        return
      }
      machine.maintenanceStatus = health as MachineHealthStatus
    }
    if (req.body.active !== undefined) {
      machine.active = req.body.active !== false && req.body.active !== 'false'
    }

    await machine.save()
    res.json({
      success: true,
      message: 'Machine updated.',
      machine: serializeMachine(machine),
    })
  } catch (error) {
    if (isDuplicateKey(error)) {
      res.status(409).json({
        success: false,
        message: duplicateMessage('Machine code'),
      })
      return
    }
    next(error)
  }
}

export async function deleteMachine(
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
) {
  try {
    const machine = await Machine.findById(req.params.id)
    if (!machine) {
      res.status(404).json({ success: false, message: 'Machine not found.' })
      return
    }
    await machine.deleteOne()
    res.json({ success: true, message: 'Machine deleted.' })
  } catch (error) {
    next(error)
  }
}

export async function listAdminProducts(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const products = await Product.find().sort({ productCode: 1 })
    res.json({
      success: true,
      products: products.map(serializeProduct),
    })
  } catch (error) {
    next(error)
  }
}

export async function createProduct(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const productCode = String(req.body.productCode ?? '').trim().toUpperCase()
    const name = String(req.body.name ?? '').trim()
    const unitRate = toNumber(req.body.unitRate) ?? 0
    const productTypeRaw = String(req.body.productType ?? 'PRODUCT')
      .trim()
      .toUpperCase()

    if (!productCode || !name) {
      res.status(400).json({
        success: false,
        message: 'Product code and name are required.',
      })
      return
    }

    if (unitRate < 0) {
      res.status(400).json({
        success: false,
        message: 'Unit rate cannot be negative.',
      })
      return
    }

    const product = await Product.create({
      productCode,
      name,
      description: String(req.body.description ?? '').trim(),
      uom: String(req.body.uom ?? 'PCS').trim().toUpperCase() || 'PCS',
      revision: String(req.body.revision ?? '').trim(),
      productType: PRODUCT_TYPES.includes(productTypeRaw as ProductType)
        ? productTypeRaw
        : 'PRODUCT',
      unitRate,
      status: mapMasterStatus(req.body.status) ?? 'ACTIVE',
    })

    res.status(201).json({
      success: true,
      message: 'Product created.',
      product: serializeProduct(product),
    })
  } catch (error) {
    if (isDuplicateKey(error)) {
      res.status(409).json({
        success: false,
        message: duplicateMessage('Product code'),
      })
      return
    }
    next(error)
  }
}

export async function updateProduct(
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
) {
  try {
    const product = await Product.findById(req.params.id)
    if (!product) {
      res.status(404).json({ success: false, message: 'Product not found.' })
      return
    }

    if (req.body.productCode !== undefined) {
      product.productCode = String(req.body.productCode).trim().toUpperCase()
    }
    if (req.body.name !== undefined) product.name = String(req.body.name).trim()
    if (req.body.description !== undefined) {
      product.description = String(req.body.description).trim()
    }
    if (req.body.uom !== undefined) {
      product.uom = String(req.body.uom).trim().toUpperCase() || 'PCS'
    }
    if (req.body.revision !== undefined) {
      product.revision = String(req.body.revision).trim()
    }
    if (req.body.productType !== undefined) {
      const productType = String(req.body.productType).trim().toUpperCase()
      if (!PRODUCT_TYPES.includes(productType as ProductType)) {
        res.status(400).json({ success: false, message: 'Invalid product type.' })
        return
      }
      product.productType = productType as ProductType
    }
    if (req.body.unitRate !== undefined) {
      const unitRate = toNumber(req.body.unitRate)
      if (unitRate === undefined || unitRate < 0) {
        res.status(400).json({
          success: false,
          message: 'Unit rate cannot be negative.',
        })
        return
      }
      product.unitRate = unitRate
    }
    if (req.body.status !== undefined) {
      const status = mapMasterStatus(req.body.status)
      if (!status) {
        res.status(400).json({ success: false, message: 'Invalid status.' })
        return
      }
      product.status = status
    }

    await product.save()
    res.json({
      success: true,
      message: 'Product updated.',
      product: serializeProduct(product),
    })
  } catch (error) {
    if (isDuplicateKey(error)) {
      res.status(409).json({
        success: false,
        message: duplicateMessage('Product code'),
      })
      return
    }
    next(error)
  }
}

export async function deleteProduct(
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
) {
  try {
    const product = await Product.findById(req.params.id)
    if (!product) {
      res.status(404).json({ success: false, message: 'Product not found.' })
      return
    }
    await product.deleteOne()
    res.json({ success: true, message: 'Product deleted.' })
  } catch (error) {
    next(error)
  }
}

export async function listAdminProcessSteps(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const processSteps = await ProcessStep.find().sort({ name: 1 })
    res.json({
      success: true,
      processSteps: processSteps.map(serializeProcessStep),
    })
  } catch (error) {
    next(error)
  }
}

export async function createProcessStep(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const code = String(req.body.code ?? '').trim().toUpperCase()
    const name = String(req.body.name ?? '').trim()
    const category = String(req.body.category ?? '').trim()
    const standardHoursPerPiece = toNumber(req.body.standardHoursPerPiece) ?? 0

    if (!code || !name || !category) {
      res.status(400).json({
        success: false,
        message: 'Code, name, and category are required.',
      })
      return
    }

    if (standardHoursPerPiece < 0) {
      res.status(400).json({
        success: false,
        message: 'Hours per piece cannot be negative.',
      })
      return
    }

    const step = await ProcessStep.create({
      code,
      name,
      category,
      standardHoursPerPiece,
      requiresQualityRelease: Boolean(req.body.requiresQualityRelease),
      status: mapMasterStatus(req.body.status) ?? 'ACTIVE',
    })

    res.status(201).json({
      success: true,
      message: 'Process step created.',
      processStep: serializeProcessStep(step),
    })
  } catch (error) {
    if (isDuplicateKey(error)) {
      res.status(409).json({
        success: false,
        message: duplicateMessage('Process step code'),
      })
      return
    }
    next(error)
  }
}

export async function updateProcessStep(
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
) {
  try {
    const step = await ProcessStep.findById(req.params.id)
    if (!step) {
      res.status(404).json({ success: false, message: 'Process step not found.' })
      return
    }

    if (req.body.code !== undefined) {
      step.code = String(req.body.code).trim().toUpperCase()
    }
    if (req.body.name !== undefined) step.name = String(req.body.name).trim()
    if (req.body.category !== undefined) {
      step.category = String(req.body.category).trim()
    }
    if (req.body.standardHoursPerPiece !== undefined) {
      const hours = toNumber(req.body.standardHoursPerPiece)
      if (hours === undefined || hours < 0) {
        res.status(400).json({
          success: false,
          message: 'Hours per piece cannot be negative.',
        })
        return
      }
      step.standardHoursPerPiece = hours
    }
    if (req.body.requiresQualityRelease !== undefined) {
      step.requiresQualityRelease = Boolean(req.body.requiresQualityRelease)
    }
    if (req.body.status !== undefined) {
      const status = mapMasterStatus(req.body.status)
      if (!status) {
        res.status(400).json({ success: false, message: 'Invalid status.' })
        return
      }
      step.status = status
    }

    await step.save()
    res.json({
      success: true,
      message: 'Process step updated.',
      processStep: serializeProcessStep(step),
    })
  } catch (error) {
    if (isDuplicateKey(error)) {
      res.status(409).json({
        success: false,
        message: duplicateMessage('Process step code'),
      })
      return
    }
    next(error)
  }
}

export async function deleteProcessStep(
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
) {
  try {
    const step = await ProcessStep.findById(req.params.id)
    if (!step) {
      res.status(404).json({ success: false, message: 'Process step not found.' })
      return
    }
    await step.deleteOne()
    res.json({ success: true, message: 'Process step deleted.' })
  } catch (error) {
    next(error)
  }
}

export async function listAdminCustomers(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const customers = await Customer.find().sort({ name: 1 })
    res.json({
      success: true,
      customers: customers.map(serializeCustomer),
    })
  } catch (error) {
    next(error)
  }
}

export async function createCustomer(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const name = String(req.body.name ?? '').trim()
    if (!name) {
      res.status(400).json({
        success: false,
        message: 'Customer name is required.',
      })
      return
    }

    const customer = await Customer.create({
      name,
      status: mapMasterStatus(req.body.status) ?? 'ACTIVE',
    })

    res.status(201).json({
      success: true,
      message: 'Customer created.',
      customer: serializeCustomer(customer),
    })
  } catch (error) {
    if (isDuplicateKey(error)) {
      res.status(409).json({
        success: false,
        message: duplicateMessage('Customer name'),
      })
      return
    }
    next(error)
  }
}

export async function updateCustomer(
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
) {
  try {
    const customer = await Customer.findById(req.params.id)
    if (!customer) {
      res.status(404).json({ success: false, message: 'Customer not found.' })
      return
    }

    if (req.body.name !== undefined) customer.name = String(req.body.name).trim()
    if (req.body.status !== undefined) {
      const status = mapMasterStatus(req.body.status)
      if (!status) {
        res.status(400).json({ success: false, message: 'Invalid status.' })
        return
      }
      customer.status = status
    }

    await customer.save()
    res.json({
      success: true,
      message: 'Customer updated.',
      customer: serializeCustomer(customer),
    })
  } catch (error) {
    if (isDuplicateKey(error)) {
      res.status(409).json({
        success: false,
        message: duplicateMessage('Customer name'),
      })
      return
    }
    next(error)
  }
}

export async function deleteCustomer(
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
) {
  try {
    const customer = await Customer.findById(req.params.id)
    if (!customer) {
      res.status(404).json({ success: false, message: 'Customer not found.' })
      return
    }
    await customer.deleteOne()
    res.json({ success: true, message: 'Customer deleted.' })
  } catch (error) {
    next(error)
  }
}

function serializeNamedMaster(item: {
  _id: { toString(): string }
  name: string
  status: string
  workingDays?: string[]
}) {
  return {
    id: item._id.toString(),
    name: item.name,
    status: item.status,
    workingDays: item.workingDays ?? [],
  }
}

export async function listAdminMachineTypes(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    let machineTypes = await MachineType.find().sort({ name: 1 })
    if (machineTypes.length === 0) {
      const names = await Machine.distinct('machineType')
      if (names.length > 0) {
        await MachineType.insertMany(
          names
            .map((name) => String(name).trim())
            .filter(Boolean)
            .map((name) => ({ name, status: 'ACTIVE' as const })),
        )
        machineTypes = await MachineType.find().sort({ name: 1 })
      }
    }
    res.json({
      success: true,
      machineTypes: machineTypes.map(serializeNamedMaster),
    })
  } catch (error) {
    next(error)
  }
}

export async function createMachineType(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const name = String(req.body.name ?? '').trim()
    if (!name) {
      res.status(400).json({
        success: false,
        message: 'Machine type name is required.',
      })
      return
    }
    const status = mapMasterStatus(req.body.status) ?? 'ACTIVE'
    const machineType = await MachineType.create({ name, status })
    res.status(201).json({
      success: true,
      message: 'Machine type created.',
      machineType: serializeNamedMaster(machineType),
    })
  } catch (error) {
    if (isDuplicateKey(error)) {
      res.status(409).json({
        success: false,
        message: duplicateMessage('Machine type'),
      })
      return
    }
    next(error)
  }
}

export async function updateMachineType(
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
) {
  try {
    const machineType = await MachineType.findById(req.params.id)
    if (!machineType) {
      res.status(404).json({ success: false, message: 'Machine type not found.' })
      return
    }
    if (req.body.name !== undefined) machineType.name = String(req.body.name).trim()
    if (req.body.status !== undefined) {
      const status = mapMasterStatus(req.body.status)
      if (!status) {
        res.status(400).json({ success: false, message: 'Invalid status.' })
        return
      }
      machineType.status = status
    }
    await machineType.save()
    res.json({
      success: true,
      message: 'Machine type updated.',
      machineType: serializeNamedMaster(machineType),
    })
  } catch (error) {
    if (isDuplicateKey(error)) {
      res.status(409).json({
        success: false,
        message: duplicateMessage('Machine type'),
      })
      return
    }
    next(error)
  }
}

export async function deleteMachineType(
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
) {
  try {
    const machineType = await MachineType.findById(req.params.id)
    if (!machineType) {
      res.status(404).json({ success: false, message: 'Machine type not found.' })
      return
    }
    await machineType.deleteOne()
    res.json({ success: true, message: 'Machine type deleted.' })
  } catch (error) {
    next(error)
  }
}

const WEEKDAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const

function mapWorkingDays(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined
  const days = value
    .map((day) => String(day).trim())
    .filter((day) => WEEKDAYS.includes(day as (typeof WEEKDAYS)[number]))
  return days
}

export async function listAdminCalendars(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    let calendars = await Calendar.find().sort({ name: 1 })
    if (calendars.length === 0) {
      await Calendar.create({
        name: 'Plant Calendar',
        workingDays: [
          'Monday',
          'Tuesday',
          'Wednesday',
          'Thursday',
          'Friday',
          'Saturday',
        ],
        status: 'ACTIVE',
      })
      calendars = await Calendar.find().sort({ name: 1 })
    }
    res.json({
      success: true,
      calendars: calendars.map(serializeNamedMaster),
    })
  } catch (error) {
    next(error)
  }
}

export async function createCalendar(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const name = String(req.body.name ?? '').trim()
    if (!name) {
      res.status(400).json({
        success: false,
        message: 'Calendar name is required.',
      })
      return
    }
    const workingDays =
      mapWorkingDays(req.body.workingDays) ?? [
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
      ]
    const status = mapMasterStatus(req.body.status) ?? 'ACTIVE'
    const calendar = await Calendar.create({ name, workingDays, status })
    res.status(201).json({
      success: true,
      message: 'Calendar created.',
      calendar: serializeNamedMaster(calendar),
    })
  } catch (error) {
    if (isDuplicateKey(error)) {
      res.status(409).json({
        success: false,
        message: duplicateMessage('Calendar name'),
      })
      return
    }
    next(error)
  }
}

export async function updateCalendar(
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
) {
  try {
    const calendar = await Calendar.findById(req.params.id)
    if (!calendar) {
      res.status(404).json({ success: false, message: 'Calendar not found.' })
      return
    }
    if (req.body.name !== undefined) calendar.name = String(req.body.name).trim()
    if (req.body.workingDays !== undefined) {
      const workingDays = mapWorkingDays(req.body.workingDays)
      if (!workingDays || workingDays.length === 0) {
        res.status(400).json({
          success: false,
          message: 'Select at least one working day.',
        })
        return
      }
      calendar.workingDays = workingDays as typeof calendar.workingDays
    }
    if (req.body.status !== undefined) {
      const status = mapMasterStatus(req.body.status)
      if (!status) {
        res.status(400).json({ success: false, message: 'Invalid status.' })
        return
      }
      calendar.status = status
    }
    await calendar.save()
    res.json({
      success: true,
      message: 'Calendar updated.',
      calendar: serializeNamedMaster(calendar),
    })
  } catch (error) {
    if (isDuplicateKey(error)) {
      res.status(409).json({
        success: false,
        message: duplicateMessage('Calendar name'),
      })
      return
    }
    next(error)
  }
}

export async function deleteCalendar(
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
) {
  try {
    const calendar = await Calendar.findById(req.params.id)
    if (!calendar) {
      res.status(404).json({ success: false, message: 'Calendar not found.' })
      return
    }
    await calendar.deleteOne()
    res.json({ success: true, message: 'Calendar deleted.' })
  } catch (error) {
    next(error)
  }
}

function weekdayFromIsoDate(isoDate: string): string {
  const noon = new Date(`${isoDate}T12:00:00+05:30`)
  const jsDay = noon.getDay()
  return WEEKDAYS[jsDay === 0 ? 6 : jsDay - 1]
}

function dayBoundsIst(isoDate: string) {
  return {
    start: new Date(`${isoDate}T00:00:00+05:30`),
    end: new Date(`${isoDate}T23:59:59.999+05:30`),
  }
}

function todayIsoIst() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(
    new Date(),
  )
}

function isoFromDateIst(value: Date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(
    value,
  )
}

function addDaysIso(isoDate: string, days: number) {
  const next = new Date(`${isoDate}T12:00:00+05:30`)
  next.setDate(next.getDate() + days)
  return isoFromDateIst(next)
}

function isoDatesInclusive(from: string, to: string) {
  const dates: string[] = []
  let current = from
  while (current <= to) {
    dates.push(current)
    current = addDaysIso(current, 1)
  }
  return dates
}

const OPEN_ORDER_STATUSES = [
  'RELEASED',
  'IN_PRODUCTION',
  'PARTIALLY_COMPLETED',
  'ON_HOLD',
]

type LeanUser = { _id: { toString(): string }; name: string; employeeCode: string }
type LeanMachine = { status: string }
type LeanOrder = { createdAt?: Date; status: string }
type LeanBatch = {
  timeLogs?: Array<{ employeeId?: unknown; hours?: number; loggedAt?: Date }>
  assignments?: Array<{ employeeId?: unknown; assignedAt?: Date }>
  serials?: Array<{ status: string }>
}

function buildDayStats(input: {
  date: string
  calendarName: string
  workingDays: string[]
  machines: LeanMachine[]
  orders: LeanOrder[]
  activeUsers: LeanUser[]
  batches: LeanBatch[]
  includeNames: boolean
}) {
  const weekday = weekdayFromIsoDate(input.date)
  const { start, end } = dayBoundsIst(input.date)
  const isWorkingDay = input.workingDays.includes(weekday)

  const machineWorking = input.machines.filter(
    (machine) => machine.status === 'AVAILABLE' || machine.status === 'BUSY',
  ).length
  const machineRepaired = input.machines.filter(
    (machine) => machine.status === 'MAINTENANCE',
  ).length
  const machineDown = input.machines.filter(
    (machine) => machine.status === 'DOWN',
  ).length
  const machineInactive = input.machines.filter(
    (machine) => machine.status === 'INACTIVE',
  ).length

  const ordersCreated = input.orders.filter((order) => {
    if (!order.createdAt) return false
    return order.createdAt >= start && order.createdAt <= end
  }).length

  const ordersOngoing = input.orders.filter((order) => {
    if (!order.createdAt || order.createdAt > end) return false
    return OPEN_ORDER_STATUSES.includes(order.status)
  }).length

  const workingIds = new Set<string>()
  let hoursLogged = 0
  let productsProduced = 0
  let batchesWorked = 0

  for (const batch of input.batches) {
    let worked = false
    for (const log of batch.timeLogs ?? []) {
      const loggedAt = log.loggedAt ? new Date(log.loggedAt) : null
      if (!loggedAt || loggedAt < start || loggedAt > end) continue
      worked = true
      hoursLogged += log.hours ?? 0
      workingIds.add(String(log.employeeId))
    }
    for (const assignment of batch.assignments ?? []) {
      const assignedAt = assignment.assignedAt
        ? new Date(assignment.assignedAt)
        : null
      if (!assignedAt || assignedAt < start || assignedAt > end) continue
      worked = true
      workingIds.add(String(assignment.employeeId))
    }
    if (!worked) continue
    batchesWorked += 1
    productsProduced += (batch.serials ?? []).filter(
      (serial) => serial.status === 'COMPLETED',
    ).length
  }

  const workingEmployees = input.activeUsers.filter((user) =>
    workingIds.has(String(user._id)),
  )
  const leaveEmployees = isWorkingDay
    ? input.activeUsers.filter((user) => !workingIds.has(String(user._id)))
    : []

  const toPerson = (user: LeanUser) => ({
    id: String(user._id),
    name: user.name,
    employeeCode: user.employeeCode,
  })

  return {
    date: input.date,
    weekday,
    isWorkingDay,
    calendarName: input.calendarName,
    machines: {
      working: machineWorking,
      repaired: machineRepaired,
      down: machineDown,
      inactive: machineInactive,
      total: input.machines.length,
    },
    ordersOngoing,
    ordersCreated,
    productsProduced,
    hoursLogged: Math.round(hoursLogged * 10) / 10,
    batchesWorked,
    employeesWorking: workingEmployees.length,
    employeesOnLeave: leaveEmployees.length,
    employeesTotal: input.activeUsers.length,
    workingNames: input.includeNames ? workingEmployees.slice(0, 12).map(toPerson) : [],
    leaveNames: input.includeNames ? leaveEmployees.slice(0, 12).map(toPerson) : [],
  }
}

async function loadCalendarContext() {
  const [machines, orders, activeUsers, batches, plantCalendar] =
    await Promise.all([
      Machine.find().select('status').lean(),
      ProductionOrder.find().select('createdAt status').lean<LeanOrder[]>(),
      User.find({
        status: 'ACTIVE',
        role: { $ne: 'SUPER_ADMIN' },
      })
        .select('name employeeCode')
        .lean(),
      DeliveryBatch.find().select('timeLogs assignments serials').lean(),
      Calendar.findOne({ status: 'ACTIVE' }).sort({ name: 1 }),
    ])

  const workingDays = plantCalendar?.workingDays ?? [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ]

  return {
    machines,
    orders,
    activeUsers,
    batches,
    workingDays,
    calendarName: plantCalendar?.name ?? 'Plant Calendar',
  }
}

export async function getCalendarDayStats(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const date = String(req.query.date ?? '').trim()
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.status(400).json({
        success: false,
        message: 'Provide date as YYYY-MM-DD.',
      })
      return
    }

    const context = await loadCalendarContext()
    res.json({
      success: true,
      stats: buildDayStats({
        date,
        ...context,
        includeNames: true,
      }),
    })
  } catch (error) {
    next(error)
  }
}

export async function getCalendarHistory(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const today = todayIsoIst()
    const fromParam = String(req.query.from ?? '').trim()
    const toParam = String(req.query.to ?? '').trim()
    const validFrom = /^\d{4}-\d{2}-\d{2}$/.test(fromParam)
    const validTo = /^\d{4}-\d{2}-\d{2}$/.test(toParam)

    let to = validTo ? toParam : today
    if (to > today) to = today

    const [firstOrder, firstBatch] = await Promise.all([
      ProductionOrder.findOne()
        .sort({ createdAt: 1 })
        .select('createdAt')
        .lean<{ createdAt?: Date } | null>(),
      DeliveryBatch.findOne()
        .sort({ createdAt: 1 })
        .select('createdAt')
        .lean<{ createdAt?: Date } | null>(),
    ])

    const earliest = [firstOrder?.createdAt, firstBatch?.createdAt]
      .filter((value): value is Date => Boolean(value))
      .map(isoFromDateIst)
      .sort()[0]

    const floor = addDaysIso(today, -364)
    const thirtyDays = addDaysIso(today, -29)
    let from = validFrom
      ? fromParam
      : earliest && earliest < thirtyDays
        ? earliest
        : thirtyDays
    if (!validFrom && from < floor) from = floor
    if (from > to) from = to

    const span = isoDatesInclusive(from, to)
    if (span.length > 366) {
      from = addDaysIso(to, -365)
    }

    const context = await loadCalendarContext()
    const days = isoDatesInclusive(from, to)
      .reverse()
      .map((date) =>
        buildDayStats({
          date,
          ...context,
          includeNames: false,
        }),
      )

    res.json({
      success: true,
      from,
      to,
      days,
    })
  } catch (error) {
    next(error)
  }
}
