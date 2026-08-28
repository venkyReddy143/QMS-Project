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
