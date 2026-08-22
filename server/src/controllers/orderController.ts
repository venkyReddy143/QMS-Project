import type { NextFunction, Request, Response } from 'express'
import { ORDER_PRIORITIES, type OrderPriority } from '../constants/enums'
import { Machine } from '../models/Machine'
import {
  ProductionOrder,
  type IOrderProcessStep,
  type IOrderProductLine,
} from '../models/ProductionOrder'
import { ProcessStep } from '../models/ProcessStep'
import { Product } from '../models/Product'

interface CreateOrderBody {
  customerPoRef?: string
  poNumber?: string
  products?: Array<{
    productId?: string
    quantity?: number | string
  }>
  productId?: string
  totalQuantity?: number | string
  budget?: number | string
  estimationPrice?: number | string
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

function productLinesFromOrder(order: {
  products?: IOrderProductLine[]
  productId?: { toString(): string }
  productCodeSnapshot?: string
  productNameSnapshot?: string
  totalQuantity: number
  uom: string
  estimationPrice: number
}) {
  if (order.products && order.products.length > 0) {
    return order.products.map((line) => ({
      productId: line.productId.toString(),
      productCode: line.productCode,
      productName: line.productName,
      quantity: line.quantity,
      uom: line.uom,
      unitRate: line.unitRate,
      estimationPrice: line.estimationPrice,
      primaryMachineId: line.primaryMachineId?.toString() ?? '',
      primaryMachineType: line.primaryMachineType ?? '',
      processSteps: (line.processSteps ?? []).map((step) => ({
        name: step.name,
        hoursPerPiece: step.hoursPerPiece,
        isCustom: step.isCustom,
        code: step.code,
      })),
    }))
  }

  if (!order.productId) return []

  return [
    {
      productId: order.productId.toString(),
      productCode: order.productCodeSnapshot ?? '',
      productName: order.productNameSnapshot ?? '',
      quantity: order.totalQuantity,
      uom: order.uom,
      unitRate: 0,
      estimationPrice: order.estimationPrice,
      primaryMachineId: '',
      primaryMachineType: '',
      processSteps: [],
    },
  ]
}

function serializeOrder(order: {
  _id: { toString(): string }
  orderNo: string
  customerName?: string
  customerPoRef: string
  products?: IOrderProductLine[]
  productId?: { toString(): string }
  productCodeSnapshot?: string
  productNameSnapshot?: string
  totalQuantity: number
  uom: string
  budget?: number
  estimationPrice: number
  dueDate: Date
  priority: OrderPriority
  notes?: string
  status: string
  createdAt?: Date
  updatedAt?: Date
}) {
  const products = productLinesFromOrder(order)
  const productName =
    products.map((line) => line.productName).filter(Boolean).join(', ') ||
    order.productNameSnapshot ||
    ''
  const first = products[0]

  return {
    id: order._id.toString(),
    orderNo: order.orderNo,
    customerName: order.customerName || '',
    customerPoRef: order.customerPoRef,
    products,
    productId: first?.productId ?? order.productId?.toString() ?? '',
    productCode: first?.productCode ?? order.productCodeSnapshot ?? '',
    productName,
    totalQuantity: order.totalQuantity,
    uom: order.uom,
    budget: order.budget ?? null,
    estimationPrice: order.estimationPrice,
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

    const customerPoRef = String(
      req.body.customerPoRef ?? req.body.poNumber ?? '',
    ).trim()
    const budget = toNumber(req.body.budget)
    const dueDateValue = String(req.body.dueDate ?? '').trim()
    const incomingProducts = Array.isArray(req.body.products)
      ? req.body.products
      : req.body.productId
        ? [{ productId: req.body.productId, quantity: req.body.totalQuantity }]
        : []

    if (!customerPoRef) {
      res.status(400).json({
        success: false,
        message: 'Order reference / PO number is required.',
      })
      return
    }

    if (incomingProducts.length === 0) {
      res.status(400).json({
        success: false,
        message: 'Add at least one product.',
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

    const seenProductIds = new Set<string>()
    const productLines: IOrderProductLine[] = []

    for (const line of incomingProducts) {
      const productId = String(line.productId ?? '').trim()
      const quantity = toNumber(line.quantity)

      if (!productId) {
        res.status(400).json({
          success: false,
          message: 'Each line needs a product.',
        })
        return
      }

      if (seenProductIds.has(productId)) {
        res.status(400).json({
          success: false,
          message: 'The same product cannot be added twice.',
        })
        return
      }
      seenProductIds.add(productId)

      if (!quantity || !Number.isInteger(quantity) || quantity < 1) {
        res.status(400).json({
          success: false,
          message: 'Each product quantity must be a whole number of at least 1.',
        })
        return
      }

      const product = await Product.findById(productId)
      if (!product || product.status !== 'ACTIVE') {
        res.status(400).json({
          success: false,
          message: 'One or more selected products were not found.',
        })
        return
      }

      productLines.push({
        productId: product._id,
        productCode: product.productCode,
        productName: product.name,
        quantity,
        uom: product.uom,
        unitRate: product.unitRate,
        estimationPrice: quantity * product.unitRate,
        processSteps: [],
      })
    }

    const totalQuantity = productLines.reduce(
      (sum, line) => sum + line.quantity,
      0,
    )
    const calculatedEstimate = productLines.reduce(
      (sum, line) => sum + line.estimationPrice,
      0,
    )
    const estimationPrice = toNumber(req.body.estimationPrice) ?? calculatedEstimate

    if (estimationPrice < 0) {
      res.status(400).json({
        success: false,
        message: 'Estimation price must be 0 or greater.',
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

    const first = productLines[0]
    const order = await ProductionOrder.create({
      orderNo: customerPoRef,
      customerName: '',
      customerPoRef,
      products: productLines,
      productId: first.productId,
      productCodeSnapshot: first.productCode,
      productNameSnapshot: productLines.map((line) => line.productName).join(', '),
      totalQuantity,
      uom: first.uom,
      budget,
      estimationPrice,
      processSteps: [],
      primaryMachineType: '',
      additionalMachineTypes: [],
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

interface UpdateOrderPlanningBody {
  customerName?: string
  products?: Array<{
    productId?: string
    primaryMachineId?: string
    processSteps?: Array<{
      name?: string
      code?: string
      hoursPerPiece?: number
      hours?: number
      isCustom?: boolean
    }>
  }>
}

export async function updateOrderPlanning(
  req: Request<{ id: string }, unknown, UpdateOrderPlanningBody>,
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

    const order = await ProductionOrder.findById(req.params.id)
    if (!order) {
      res.status(404).json({
        success: false,
        message: 'Order not found.',
      })
      return
    }

    const customerName = String(req.body.customerName ?? '').trim()
    if (!customerName) {
      res.status(400).json({
        success: false,
        message: 'Customer name is required.',
      })
      return
    }

    const incomingProducts = Array.isArray(req.body.products)
      ? req.body.products
      : []
    if (incomingProducts.length === 0) {
      res.status(400).json({
        success: false,
        message: 'Add machine and process steps for each product.',
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

    const incomingByProductId = new Map(
      incomingProducts.map((item) => [String(item.productId ?? ''), item]),
    )

    for (const line of order.products) {
      const incoming = incomingByProductId.get(line.productId.toString())
      if (!incoming) {
        res.status(400).json({
          success: false,
          message: `Missing planning details for ${line.productName}.`,
        })
        return
      }

      const machineId = String(incoming.primaryMachineId ?? '').trim()
      if (!machineId) {
        res.status(400).json({
          success: false,
          message: `Select a machine for ${line.productName}.`,
        })
        return
      }

      const machine = await Machine.findById(machineId)
      if (!machine || !machine.active) {
        res.status(400).json({
          success: false,
          message: `Selected machine was not found for ${line.productName}.`,
        })
        return
      }

      const incomingSteps = Array.isArray(incoming.processSteps)
        ? incoming.processSteps
        : []
      if (incomingSteps.length === 0) {
        res.status(400).json({
          success: false,
          message: `Add at least one process step for ${line.productName}.`,
        })
        return
      }

      const processSteps: IOrderProcessStep[] = incomingSteps.map(
        (step, index) => {
          const name = String(step.name ?? '').trim()
          const hours = toNumber(step.hoursPerPiece ?? step.hours) ?? 0
          const master =
            stepByName.get(name.toLowerCase()) ??
            stepByCode.get(String(step.code ?? '').toLowerCase())

          return {
            sequence: index + 1,
            name,
            code: master?.code ?? step.code,
            machineType: String(master?.category ?? machine.machineType).trim(),
            hoursPerPiece: hours,
            isCustom: Boolean(step.isCustom) || !master,
          }
        },
      )

      if (processSteps.some((step) => !step.name || step.hoursPerPiece < 0)) {
        res.status(400).json({
          success: false,
          message: `Each process step for ${line.productName} needs a name, and hours cannot be negative.`,
        })
        return
      }

      line.primaryMachineId = machine._id
      line.primaryMachineType = machine.machineType
      line.processSteps = processSteps
    }

    order.customerName = customerName
    const first = order.products[0]
    order.primaryMachineType = first?.primaryMachineType ?? ''
    order.processSteps = first?.processSteps ?? []
    await order.save()

    res.json({
      success: true,
      message: 'Order details saved.',
      order: serializeOrder(order),
    })
  } catch (error) {
    next(error)
  }
}
