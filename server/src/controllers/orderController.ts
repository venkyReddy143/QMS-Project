import type { NextFunction, Request, Response } from 'express'
import { ORDER_PRIORITIES, type OrderPriority } from '../constants/enums'
import { ProcessRoute } from '../models/ProcessRoute'
import { ProcessStep } from '../models/ProcessStep'
import {
  ProductionOrder,
  type IOrderProcessStep,
} from '../models/ProductionOrder'
import { Product } from '../models/Product'

interface CreateOrderBody {
  customerName?: string
  productId?: string
  productName?: string
  customerPoRef?: string
  poNumber?: string
  totalQuantity?: number
  budget?: number | string
  estimationPrice?: number | string
  primaryMachineType?: string
  additionalMachineTypes?: string[]
  processSteps?: Array<{
    name?: string
    code?: string
    machineType?: string
    hoursPerPiece?: number
    hours?: number
    isCustom?: boolean
  }>
  dueDate?: string
  priority?: string
  notes?: string
}

function toNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function mapPriority(value: string | undefined): OrderPriority {
  const normalized = String(value ?? 'NORMAL').trim().toUpperCase()
  if (normalized === 'URGENT') return 'CRITICAL'
  if (ORDER_PRIORITIES.includes(normalized as OrderPriority)) {
    return normalized as OrderPriority
  }
  return 'NORMAL'
}

function serializeOrder(order: {
  _id: { toString(): string }
  orderNo: string
  customerName: string
  customerPoRef: string
  productId: { toString(): string }
  productCodeSnapshot: string
  productNameSnapshot: string
  totalQuantity: number
  uom: string
  budget?: number
  estimationPrice: number
  processSteps: IOrderProcessStep[]
  primaryMachineType: string
  additionalMachineTypes: string[]
  dueDate: Date
  priority: OrderPriority
  notes?: string
  status: string
  createdAt?: Date
  updatedAt?: Date
}) {
  return {
    id: order._id.toString(),
    orderNo: order.orderNo,
    customerName: order.customerName,
    customerPoRef: order.customerPoRef,
    productId: order.productId.toString(),
    productCode: order.productCodeSnapshot,
    productName: order.productNameSnapshot,
    totalQuantity: order.totalQuantity,
    uom: order.uom,
    budget: order.budget ?? null,
    estimationPrice: order.estimationPrice,
    processSteps: order.processSteps,
    primaryMachineType: order.primaryMachineType,
    additionalMachineTypes: order.additionalMachineTypes,
    dueDate: order.dueDate,
    priority: order.priority,
    notes: order.notes ?? '',
    status: order.status,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  }
}

export async function createOrder(
  req: Request<unknown, unknown, CreateOrderBody>,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required.',
      })
      return
    }

    const customerName = String(req.body.customerName ?? '').trim()
    const customerPoRef = String(
      req.body.customerPoRef ?? req.body.poNumber ?? '',
    ).trim()
    const totalQuantity = toNumber(req.body.totalQuantity)
    const estimationPrice = toNumber(req.body.estimationPrice)
    const budget = toNumber(req.body.budget)
    const primaryMachineType = String(req.body.primaryMachineType ?? '').trim()
    const dueDateValue = String(req.body.dueDate ?? '').trim()
    const incomingSteps = Array.isArray(req.body.processSteps)
      ? req.body.processSteps
      : []

    if (!customerName) {
      res.status(400).json({
        success: false,
        message: 'Customer name is required.',
      })
      return
    }

    if (!customerPoRef) {
      res.status(400).json({
        success: false,
        message: 'Order reference / PO number is required.',
      })
      return
    }

    if (!totalQuantity || totalQuantity < 1) {
      res.status(400).json({
        success: false,
        message: 'Total quantity must be at least 1.',
      })
      return
    }

    if (estimationPrice === undefined || estimationPrice < 0) {
      res.status(400).json({
        success: false,
        message: 'Estimation price is required.',
      })
      return
    }

    if (!primaryMachineType) {
      res.status(400).json({
        success: false,
        message: 'Primary machine is required.',
      })
      return
    }

    if (!dueDateValue) {
      res.status(400).json({
        success: false,
        message: 'Target completion date is required.',
      })
      return
    }

    const dueDate = new Date(dueDateValue)
    if (Number.isNaN(dueDate.getTime())) {
      res.status(400).json({
        success: false,
        message: 'Enter a valid target completion date.',
      })
      return
    }

    if (incomingSteps.length === 0) {
      res.status(400).json({
        success: false,
        message: 'At least one process step is required.',
      })
      return
    }

    const product = req.body.productId
      ? await Product.findById(req.body.productId)
      : await Product.findOne({
          name: String(req.body.productName ?? '').trim(),
          status: 'ACTIVE',
        })

    if (!product) {
      res.status(400).json({
        success: false,
        message: 'Selected product was not found.',
      })
      return
    }

    const existing = await ProductionOrder.findOne({ orderNo: customerPoRef })
    if (existing) {
      res.status(409).json({
        success: false,
        message: `Order ${customerPoRef} already exists.`,
      })
      return
    }

    const masterSteps = await ProcessStep.find({ status: 'ACTIVE' }).lean()
    const stepByName = new Map(
      masterSteps.map((step) => [step.name.toLowerCase(), step]),
    )
    const stepByCode = new Map(
      masterSteps.map((step) => [step.code.toLowerCase(), step]),
    )

    const processSteps: IOrderProcessStep[] = incomingSteps.map((step, index) => {
      const name = String(step.name ?? '').trim()
      const hours = toNumber(step.hoursPerPiece ?? step.hours) ?? 0
      const master =
        stepByName.get(name.toLowerCase()) ??
        stepByCode.get(String(step.code ?? '').toLowerCase())

      return {
        sequence: index + 1,
        name,
        code: master?.code ?? step.code,
        machineType: String(step.machineType ?? master?.category ?? name).trim(),
        hoursPerPiece: hours,
        isCustom: Boolean(step.isCustom) || !master,
      }
    })

    if (processSteps.some((step) => !step.name || step.hoursPerPiece <= 0)) {
      res.status(400).json({
        success: false,
        message: 'Each process step needs a name and hours greater than 0.',
      })
      return
    }

    const route = await ProcessRoute.findOne({
      productId: product._id,
      status: 'ACTIVE',
    }).sort({ version: -1 })

    const additionalMachineTypes = (req.body.additionalMachineTypes ?? [])
      .map((item) => String(item).trim())
      .filter((item) => item && item !== primaryMachineType)

    const order = await ProductionOrder.create({
      orderNo: customerPoRef,
      customerName,
      customerPoRef,
      productId: product._id,
      productCodeSnapshot: product.productCode,
      productNameSnapshot: product.name,
      totalQuantity,
      uom: product.uom,
      budget,
      estimationPrice,
      routeId: route?._id,
      processSteps,
      primaryMachineType,
      additionalMachineTypes,
      dueDate,
      priority: mapPriority(req.body.priority),
      notes: String(req.body.notes ?? '').trim() || undefined,
      status: 'RELEASED',
      createdBy: req.user._id,
    })

    res.status(201).json({
      success: true,
      message: 'Order created successfully.',
      order: serializeOrder(order),
    })
  } catch (error) {
    next(error)
  }
}

export async function listOrders(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const orders = await ProductionOrder.find()
      .sort({ createdAt: -1 })
      .lean()

    res.json({
      success: true,
      orders: orders.map(serializeOrder),
    })
  } catch (error) {
    next(error)
  }
}

export async function getOrder(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const order = await ProductionOrder.findById(req.params.id).lean()

    if (!order) {
      res.status(404).json({
        success: false,
        message: 'Order not found.',
      })
      return
    }

    res.json({
      success: true,
      order: serializeOrder(order),
    })
  } catch (error) {
    next(error)
  }
}
