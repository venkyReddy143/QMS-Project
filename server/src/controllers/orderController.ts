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
  orderNo?: string
  customerName?: string
  ownerName?: string
  inChargeName?: string
  orderDate?: string
  status?: string
  products?: Array<{
    productId?: string
    quantity?: number | string
    description?: string
    drawingNumber?: string
    remarks?: string
    rawMaterialSourcing?: string
  }>
  productId?: string
  totalQuantity?: number | string
  budget?: number | string
  estimationPrice?: number | string
  dueDate?: string
  priority?: string
  notes?: string
}

function mapOrderHeaderStatus(value: string | undefined): 'OPEN' | 'CLOSED' {
  const normalized = String(value ?? 'OPEN').trim().toUpperCase()
  if (normalized === 'CLOSE' || normalized === 'CLOSED') return 'CLOSED'
  return 'OPEN'
}

function orderNoDatePrefix(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `ORD-${year}${month}${day}-`
}

async function generateOrderNo(orderDate?: Date): Promise<string> {
  const prefix = orderNoDatePrefix(orderDate ?? new Date())
  const latest = await ProductionOrder.findOne({
    orderNo: { $regex: `^${prefix}` },
  })
    .sort({ orderNo: -1 })
    .select('orderNo')
    .lean()

  let next = 1
  if (latest?.orderNo) {
    const suffix = latest.orderNo.slice(prefix.length)
    const parsed = Number.parseInt(suffix, 10)
    if (Number.isFinite(parsed) && parsed >= next) {
      next = parsed + 1
    }
  }

  return `${prefix}${String(next).padStart(4, '0')}`
}

async function buildProductLines(
  incomingProducts: Array<{
    productId?: string
    quantity?: number | string
    description?: string
    drawingNumber?: string
    remarks?: string
    rawMaterialSourcing?: string
    lineStatus?: string
  }>,
): Promise<{ lines: IOrderProductLine[]; error?: string }> {
  const seenProductIds = new Set<string>()
  const productLines: IOrderProductLine[] = []
  let lineNumber = 0

  for (const line of incomingProducts) {
    const productId = String(line.productId ?? '').trim()
    const quantity = toNumber(line.quantity)

    if (!productId) {
      return { lines: [], error: 'Each line needs a product.' }
    }

    if (seenProductIds.has(productId)) {
      return { lines: [], error: 'The same product cannot be added twice.' }
    }
    seenProductIds.add(productId)

    if (!quantity || !Number.isInteger(quantity) || quantity < 1) {
      return {
        lines: [],
        error: 'Each product quantity must be a whole number of at least 1.',
      }
    }

    const product = await Product.findById(productId)
    if (!product || product.status !== 'ACTIVE') {
      return {
        lines: [],
        error: 'One or more selected products were not found.',
      }
    }

    lineNumber += 1
    const sourcing = String(line.rawMaterialSourcing ?? 'COMPANY')
      .trim()
      .toUpperCase()
    const statusRaw = String(line.lineStatus ?? 'OPEN').trim().toUpperCase()
    const lineStatus =
      statusRaw === 'CLOSE' || statusRaw === 'CLOSED' ? 'CLOSED' : 'OPEN'
    productLines.push({
      productId: product._id,
      productCode: product.productCode,
      productName: product.name,
      lineNumber,
      quantity,
      description: String(line.description ?? '').trim(),
      drawingNumber: String(line.drawingNumber ?? '').trim(),
      remarks: String(line.remarks ?? '').trim(),
      lineStatus,
      rawMaterialSourcing: sourcing === 'CUSTOMER' ? 'CUSTOMER' : 'COMPANY',
      uom: product.uom,
      unitRate: product.unitRate,
      estimationPrice: quantity * product.unitRate,
      processSteps: [],
    })
  }

  return { lines: productLines }
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
    return order.products.map((line, index) => ({
      productId: line.productId.toString(),
      productCode: line.productCode,
      productName: line.productName,
      lineNumber: line.lineNumber ?? index + 1,
      quantity: line.quantity,
      description: line.description ?? '',
      drawingNumber: line.drawingNumber ?? '',
      remarks: line.remarks ?? '',
      lineStatus: line.lineStatus ?? 'OPEN',
      rawMaterialSourcing: line.rawMaterialSourcing ?? 'COMPANY',
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
        sequence: step.sequence,
        machineId: step.machineId?.toString() ?? '',
        machineCode: step.machineCode ?? '',
        machineName: step.machineName ?? '',
      })),
    }))
  }

  if (!order.productId) return []

  return [
    {
      productId: order.productId.toString(),
      productCode: order.productCodeSnapshot ?? '',
      productName: order.productNameSnapshot ?? '',
      lineNumber: 1,
      quantity: order.totalQuantity,
      description: '',
      drawingNumber: '',
      remarks: '',
      lineStatus: 'OPEN',
      rawMaterialSourcing: 'COMPANY',
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
  orderDate?: Date
  customerName?: string
  customerPoRef: string
  ownerName?: string
  inChargeName?: string
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
  createdBy?: { toString(): string }
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
    orderDate: order.orderDate ?? order.createdAt,
    customerName: order.customerName || '',
    customerPoRef: order.customerPoRef,
    ownerName: order.ownerName ?? '',
    inChargeName: order.inChargeName ?? '',
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
    createdBy: order.createdBy?.toString() ?? '',
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  }
}

export async function nextOrderNo(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const orderNo = await generateOrderNo()
    res.json({
      success: true,
      orderNo,
    })
  } catch (error) {
    next(error)
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
    const headerOnly = incomingProducts.length === 0
    const orderStatus = mapOrderHeaderStatus(req.body.status)

    if (!customerPoRef) {
      res.status(400).json({
        success: false,
        message: 'Order reference / PO number is required.',
      })
      return
    }

    let productLines: IOrderProductLine[] = []
    if (!headerOnly) {
      const built = await buildProductLines(incomingProducts)
      if (built.error) {
        res.status(400).json({ success: false, message: built.error })
        return
      }
      productLines = built.lines
    }

    const orderDateRaw = String(req.body.orderDate ?? '').trim()
    const orderDate = orderDateRaw ? new Date(orderDateRaw) : new Date()
    if (Number.isNaN(orderDate.getTime())) {
      res.status(400).json({
        success: false,
        message: 'Enter a valid order date.',
      })
      return
    }

    let dueDate = orderDate
    if (dueDateValue) {
      dueDate = new Date(dueDateValue)
      if (Number.isNaN(dueDate.getTime())) {
        res.status(400).json({
          success: false,
          message: 'Enter a valid target completion date.',
        })
        return
      }
    } else if (!headerOnly) {
      res.status(400).json({
        success: false,
        message: 'Target completion date is required.',
      })
      return
    }

    const totalQuantity = productLines.reduce(
      (sum, line) => sum + line.quantity,
      0,
    )
    const calculatedEstimate = productLines.reduce(
      (sum, line) => sum + line.estimationPrice,
      0,
    )
    const estimationPrice =
      toNumber(req.body.estimationPrice) ?? calculatedEstimate

    if (estimationPrice < 0) {
      res.status(400).json({
        success: false,
        message: 'Estimation price must be 0 or greater.',
      })
      return
    }

    let orderNo = String(req.body.orderNo ?? '').trim().toUpperCase()
    if (!orderNo) {
      orderNo = await generateOrderNo(orderDate)
    }

    const existing = await ProductionOrder.findOne({ orderNo })
    if (existing) {
      orderNo = await generateOrderNo(orderDate)
    }

    const first = productLines[0]
    const order = await ProductionOrder.create({
      orderNo,
      orderDate,
      customerName: String(req.body.customerName ?? '').trim(),
      customerPoRef,
      ownerName: String(req.body.ownerName ?? '').trim() || req.user.name,
      inChargeName: String(req.body.inChargeName ?? '').trim(),
      products: productLines,
      productId: first?.productId,
      productCodeSnapshot: first?.productCode ?? '',
      productNameSnapshot: productLines.map((line) => line.productName).join(', '),
      totalQuantity,
      uom: first?.uom ?? 'PCS',
      budget,
      estimationPrice,
      processSteps: [],
      primaryMachineType: '',
      additionalMachineTypes: [],
      dueDate,
      priority: mapPriority(req.body.priority),
      notes: String(req.body.notes ?? '').trim() || undefined,
      status: orderStatus,
      createdBy: req.user._id,
    })

    res.status(201).json({
      success: true,
      message: headerOnly
        ? 'Order header created successfully.'
        : 'Order created successfully.',
      order: serializeOrder(order),
    })
  } catch (error) {
    next(error)
  }
}

export async function updateOrderDetails(
  req: Request<{ id: string }, unknown, CreateOrderBody>,
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

    if (Array.isArray(req.body.products)) {
      if (req.body.products.length === 0) {
        res.status(400).json({
          success: false,
          message: 'Add at least one product.',
        })
        return
      }
      const built = await buildProductLines(req.body.products)
      if (built.error) {
        res.status(400).json({ success: false, message: built.error })
        return
      }
      order.products = built.lines
      order.totalQuantity = built.lines.reduce((sum, line) => sum + line.quantity, 0)
      order.estimationPrice = built.lines.reduce(
        (sum, line) => sum + line.estimationPrice,
        0,
      )
      const first = built.lines[0]
      order.productId = first.productId
      order.productCodeSnapshot = first.productCode
      order.productNameSnapshot = built.lines
        .map((line) => line.productName)
        .join(', ')
      order.uom = first.uom
    }

    if (req.body.dueDate !== undefined) {
      const dueDateValue = String(req.body.dueDate ?? '').trim()
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
      order.dueDate = dueDate
    }

    if (req.body.priority !== undefined) {
      order.priority = mapPriority(req.body.priority)
    }

    if (req.body.notes !== undefined) {
      order.notes = String(req.body.notes ?? '').trim()
    }

    if (req.body.status !== undefined) {
      order.status = mapOrderHeaderStatus(req.body.status)
    }

    await order.save()

    res.json({
      success: true,
      message: 'Order details updated.',
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
  ownerName?: string
  inChargeName?: string
  products?: Array<{
    productId?: string
    primaryMachineId?: string
    drawingNumber?: string
    remarks?: string
    rawMaterialSourcing?: string
    lineStatus?: string
    processSteps?: Array<{
      name?: string
      code?: string
      hoursPerPiece?: number
      hours?: number
      isCustom?: boolean
      machineId?: string
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

    for (const incoming of incomingProducts) {
      const productId = String(incoming.productId ?? '').trim()
      const line = order.products.find(
        (item) => item.productId.toString() === productId,
      )
      if (!line) {
        res.status(400).json({
          success: false,
          message: 'That product is not on this order.',
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

      const processSteps: IOrderProcessStep[] = []
      for (const [index, step] of incomingSteps.entries()) {
        const name = String(step.name ?? '').trim()
        const hours = toNumber(step.hoursPerPiece ?? step.hours) ?? 0
        const stepMachineId = String(step.machineId ?? '').trim()
        if (!name || hours < 0) {
          res.status(400).json({
            success: false,
            message: `Each process step for ${line.productName} needs a name, and hours cannot be negative.`,
          })
          return
        }
        if (!stepMachineId) {
          res.status(400).json({
            success: false,
            message: `Select a machine for ${name} on ${line.productName}.`,
          })
          return
        }

        const machine = await Machine.findById(stepMachineId)
        if (!machine || !machine.active) {
          res.status(400).json({
            success: false,
            message: `Selected machine was not found for ${name} on ${line.productName}.`,
          })
          return
        }

        const master =
          stepByName.get(name.toLowerCase()) ??
          stepByCode.get(String(step.code ?? '').toLowerCase())

        processSteps.push({
          sequence: index + 1,
          name,
          code: master?.code ?? step.code,
          machineType: String(machine.machineType || master?.category || '').trim(),
          machineId: machine._id,
          machineCode: machine.machineCode,
          machineName: machine.name,
          hoursPerPiece: hours,
          isCustom: Boolean(step.isCustom) || !master,
        })
      }

      const firstMachineId = processSteps[0]?.machineId
      const firstMachine = firstMachineId
        ? await Machine.findById(firstMachineId)
        : null
      line.primaryMachineId = firstMachine?._id
      line.primaryMachineType = firstMachine?.machineType ?? ''
      line.processSteps = processSteps
      if (incoming.drawingNumber !== undefined) {
        line.drawingNumber = String(incoming.drawingNumber ?? '').trim()
      }
      if (incoming.remarks !== undefined) {
        line.remarks = String(incoming.remarks ?? '').trim()
      }
      if (incoming.rawMaterialSourcing !== undefined) {
        const sourcing = String(incoming.rawMaterialSourcing)
          .trim()
          .toUpperCase()
        line.rawMaterialSourcing =
          sourcing === 'CUSTOMER' ? 'CUSTOMER' : 'COMPANY'
      }
      if (incoming.lineStatus !== undefined) {
        const status = String(incoming.lineStatus).trim().toUpperCase()
        if (
          ['OPEN', 'CLOSED', 'IN_PRODUCTION', 'COMPLETED', 'ON_HOLD'].includes(
            status,
          )
        ) {
          line.lineStatus = status as typeof line.lineStatus
        }
      }
    }

    order.customerName = customerName
    if (req.body.ownerName !== undefined) {
      order.ownerName = String(req.body.ownerName ?? '').trim()
    }
    if (req.body.inChargeName !== undefined) {
      order.inChargeName = String(req.body.inChargeName ?? '').trim()
    }
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
