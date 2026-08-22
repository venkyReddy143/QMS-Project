import type { NextFunction, Request, Response } from 'express'
import mongoose from 'mongoose'
import {
  BATCH_STATUSES,
  ORDER_PRIORITIES,
  type BatchStatus,
  type OrderPriority,
} from '../constants/enums'
import { DeliveryBatch } from '../models/DeliveryBatch'
import { ProductionOrder } from '../models/ProductionOrder'
import { User } from '../models/User'
import { buildBatchSerials } from '../utils/serialNumber'

interface BatchBody {
  orderId?: string
  orderNo?: string
  productId?: string
  processStepName?: string
  batchNo?: string
  plannedQuantity?: number | string
  bufferQty?: number | string
  totalBatchQty?: number | string
  targetDispatchDate?: string
  priority?: string
  status?: string
  completedQuantity?: number | string
  dispatchedQuantity?: number | string
  progressPercent?: number | string
}

function toNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function mapPriority(value: string | undefined): OrderPriority {
  const normalized = String(value ?? 'NORMAL').trim().toUpperCase()
  if (normalized === 'URGENT' || normalized === 'LOW') {
    return normalized === 'URGENT' ? 'CRITICAL' : 'NORMAL'
  }
  if (ORDER_PRIORITIES.includes(normalized as OrderPriority)) {
    return normalized as OrderPriority
  }
  return 'NORMAL'
}

function mapStatus(value: string | undefined): BatchStatus | undefined {
  if (!value) return undefined
  const normalized = String(value).trim().toUpperCase().replace(/\s+/g, '_')
  if (BATCH_STATUSES.includes(normalized as BatchStatus)) {
    return normalized as BatchStatus
  }
  return undefined
}

function looksLikeObjectId(value: string): boolean {
  return mongoose.Types.ObjectId.isValid(value) && value.length === 24
}

async function findOrder(orderRef: string) {
  const trimmed = orderRef.trim()
  if (!trimmed) return null

  if (looksLikeObjectId(trimmed)) {
    const byId = await ProductionOrder.findById(trimmed)
    if (byId) return byId
  }

  return ProductionOrder.findOne({
    $or: [{ orderNo: trimmed }, { customerPoRef: trimmed }],
  })
}

function createdByName(createdBy: unknown): string {
  if (createdBy && typeof createdBy === 'object' && 'name' in createdBy) {
    return String((createdBy as { name?: string }).name ?? '')
  }
  return ''
}

function serializeBatch(
  batch: {
    _id: { toString(): string }
    orderId: { toString(): string } | { _id?: { toString(): string }; orderNo?: string }
    productId?: { toString(): string }
    productName?: string
    processStepName?: string
    batchNo: string
    plannedQuantity: number
    bufferQty: number
    totalBatchQty: number
    targetDispatchDate: Date
    priority: OrderPriority
    status: BatchStatus
    completedQuantity: number
    dispatchedQuantity: number
    progressPercent: number
    assignments?: Array<{
      employeeId: { toString(): string }
      employeeName: string
      shift: string
      assignedAt?: Date
    }>
    timeLogs?: Array<{
      employeeId: { toString(): string }
      employeeName: string
      shift: string
      hours: number
      note?: string
      loggedAt?: Date
    }>
    serials?: Array<{
      serialNumber: string
      sequence: number
      status: string
    }>
    createdBy: unknown
    createdAt?: Date
    updatedAt?: Date
  },
  orderNo?: string,
) {
  const order =
    batch.orderId && typeof batch.orderId === 'object' && 'orderNo' in batch.orderId
      ? (batch.orderId as { _id?: { toString(): string }; orderNo?: string })
      : null

  const timeLogs = batch.timeLogs ?? []
  const loggedHours = timeLogs.reduce((sum, log) => sum + (log.hours ?? 0), 0)

  return {
    id: batch._id.toString(),
    orderId: order?._id?.toString() ?? String(batch.orderId),
    orderNo: orderNo ?? order?.orderNo ?? '',
    productId: batch.productId ? String(batch.productId) : '',
    productName: batch.productName ?? '',
    processStepName: batch.processStepName ?? '',
    batchNo: batch.batchNo,
    plannedQuantity: batch.plannedQuantity,
    bufferQty: batch.bufferQty ?? 0,
    totalBatchQty: batch.totalBatchQty,
    targetDispatchDate: batch.targetDispatchDate,
    priority: batch.priority,
    status: batch.status,
    completedQuantity: batch.completedQuantity,
    dispatchedQuantity: batch.dispatchedQuantity,
    progressPercent: batch.progressPercent,
    assignments: (batch.assignments ?? []).map((item) => ({
      employeeId: item.employeeId.toString(),
      employeeName: item.employeeName,
      shift: item.shift,
      assignedAt: item.assignedAt,
    })),
    timeLogs: timeLogs.map((log) => ({
      employeeId: log.employeeId.toString(),
      employeeName: log.employeeName,
      shift: log.shift,
      hours: log.hours,
      note: log.note ?? '',
      loggedAt: log.loggedAt,
    })),
    loggedHours,
    serials: (batch.serials ?? []).map((item) => ({
      serialNumber: item.serialNumber,
      sequence: item.sequence,
      status: item.status,
    })),
    serialCount: (batch.serials ?? []).length,
    createdBy: createdByName(batch.createdBy),
    createdById:
      batch.createdBy &&
      typeof batch.createdBy === 'object' &&
      '_id' in (batch.createdBy as object)
        ? String((batch.createdBy as { _id: { toString(): string } })._id)
        : String(batch.createdBy ?? ''),
    createdAt: batch.createdAt,
    updatedAt: batch.updatedAt,
  }
}

async function allocationForOrder(
  orderId: mongoose.Types.ObjectId,
  excludeBatchId?: string,
) {
  const match: Record<string, unknown> = { orderId }
  if (excludeBatchId && looksLikeObjectId(excludeBatchId)) {
    match._id = { $ne: new mongoose.Types.ObjectId(excludeBatchId) }
  }

  const [summary] = await DeliveryBatch.aggregate<{ allocated: number }>([
    { $match: match },
    { $group: { _id: null, allocated: { $sum: '$plannedQuantity' } } },
  ])

  return summary?.allocated ?? 0
}

async function nextSerialSequence(orderId: mongoose.Types.ObjectId) {
  const [summary] = await DeliveryBatch.aggregate<{ maxSeq: number }>([
    { $match: { orderId } },
    { $unwind: { path: '$serials', preserveNullAndEmptyArrays: false } },
    { $group: { _id: null, maxSeq: { $max: '$serials.sequence' } } },
  ])
  return (summary?.maxSeq ?? 0) + 1
}

export async function createBatch(
  req: Request<{ orderId?: string }, unknown, BatchBody>,
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

    const orderRef = String(
      req.params.orderId ?? req.body.orderId ?? req.body.orderNo ?? '',
    ).trim()
    const batchNo = String(req.body.batchNo ?? '').trim()
    const plannedQuantity = toNumber(req.body.plannedQuantity)
    const bufferQty = toNumber(req.body.bufferQty) ?? 0
    const dueDateValue = String(req.body.targetDispatchDate ?? '').trim()

    if (!orderRef) {
      res.status(400).json({
        success: false,
        message: 'Order ID is required.',
      })
      return
    }

    if (!batchNo) {
      res.status(400).json({
        success: false,
        message: 'Batch number is required.',
      })
      return
    }

    if (!plannedQuantity || plannedQuantity < 1) {
      res.status(400).json({
        success: false,
        message: 'Planned quantity must be at least 1.',
      })
      return
    }

    if (!dueDateValue) {
      res.status(400).json({
        success: false,
        message: 'Target dispatch date is required.',
      })
      return
    }

    const targetDispatchDate = new Date(dueDateValue)
    if (Number.isNaN(targetDispatchDate.getTime())) {
      res.status(400).json({
        success: false,
        message: 'Enter a valid target dispatch date.',
      })
      return
    }

    const order = await findOrder(orderRef)
    if (!order) {
      res.status(404).json({
        success: false,
        message: 'Order not found.',
      })
      return
    }

    const duplicate = await DeliveryBatch.findOne({
      orderId: order._id,
      batchNo,
    })
    if (duplicate) {
      res.status(409).json({
        success: false,
        message: `Batch ${batchNo} already exists for this order.`,
      })
      return
    }

    const allocated = await allocationForOrder(order._id)
    const remaining = order.totalQuantity - allocated

    const productId = String(req.body.productId ?? '').trim()
    const processStepName = String(req.body.processStepName ?? '').trim()
    const productLine = productId
      ? order.products.find((line) => line.productId.toString() === productId)
      : order.products[0]

    if (order.products.length > 0 && !productLine) {
      res.status(400).json({
        success: false,
        message: 'Select a product for this batch.',
      })
      return
    }

    if (productLine) {
      const match: Record<string, unknown> = {
        orderId: order._id,
        productId: productLine.productId,
        processStepName,
      }
      const [productSummary] = await DeliveryBatch.aggregate<{ allocated: number }>([
        { $match: match },
        { $group: { _id: null, allocated: { $sum: '$plannedQuantity' } } },
      ])
      const productRemaining =
        productLine.quantity - (productSummary?.allocated ?? 0)
      if (plannedQuantity > productRemaining) {
        res.status(400).json({
          success: false,
          message: `Planned quantity exceeds remaining qty for ${productLine.productName}${
            processStepName ? ` / ${processStepName}` : ''
          } (${productRemaining} pcs).`,
        })
        return
      }
    } else if (plannedQuantity > remaining) {
      res.status(400).json({
        success: false,
        message: `Planned quantity exceeds remaining order qty (${remaining} pcs).`,
      })
      return
    }

    const totalBatchQty =
      toNumber(req.body.totalBatchQty) ?? plannedQuantity + bufferQty

    const serials = buildBatchSerials({
      orderNo: order.orderNo,
      batchNo,
      quantity: plannedQuantity,
      startSequence: await nextSerialSequence(order._id),
    })

    const batch = await DeliveryBatch.create({
      orderId: order._id,
      orderNo: order.orderNo,
      productId: productLine?.productId,
      productName: productLine?.productName ?? order.productNameSnapshot ?? '',
      processStepName,
      batchNo,
      plannedQuantity,
      bufferQty,
      totalBatchQty,
      targetDispatchDate,
      priority: mapPriority(req.body.priority),
      status: mapStatus(req.body.status) ?? 'SCHEDULED',
      completedQuantity: 0,
      dispatchedQuantity: 0,
      progressPercent: 0,
      assignments: [],
      timeLogs: [],
      serials,
      createdBy: req.user._id,
    })

    if (order.status === 'DRAFT' || order.status === 'RELEASED') {
      order.status = 'IN_PRODUCTION'
      await order.save()
    }

    const populated = await batch.populate('createdBy', 'name')

    res.status(201).json({
      success: true,
      message: `Batch ${batchNo} created with ${serials.length} serial numbers.`,
      batch: serializeBatch(populated, order.orderNo),
      allocation: {
        orderQty: order.totalQuantity,
        allocated: allocated + plannedQuantity,
        remaining: remaining - plannedQuantity,
      },
    })
  } catch (error) {
    next(error)
  }
}

export async function listBatches(
  req: Request<{ orderId?: string }>,
  res: Response,
  next: NextFunction,
) {
  try {
    const orderRef = String(req.params.orderId ?? req.query.orderId ?? '').trim()

    if (!orderRef) {
      const batches = await DeliveryBatch.find()
        .populate('createdBy', 'name')
        .populate('orderId', 'orderNo')
        .sort({ createdAt: -1 })

      res.json({
        success: true,
        batches: batches.map((batch) => serializeBatch(batch)),
      })
      return
    }

    const order = await findOrder(orderRef)
    if (!order) {
      res.status(404).json({
        success: false,
        message: 'Order not found.',
      })
      return
    }

    const batches = await DeliveryBatch.find({ orderId: order._id })
      .populate('createdBy', 'name')
      .sort({ createdAt: 1 })

    const allocated = batches.reduce((sum, batch) => sum + batch.plannedQuantity, 0)

    res.json({
      success: true,
      order: {
        id: order._id.toString(),
        orderNo: order.orderNo,
        customerName: order.customerName,
        productName: order.productNameSnapshot,
        status: order.status,
        orderQty: order.totalQuantity,
        allocated,
        remaining: Math.max(order.totalQuantity - allocated, 0),
      },
      batches: batches.map((batch) => serializeBatch(batch, order.orderNo)),
    })
  } catch (error) {
    next(error)
  }
}

export async function getBatch(
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
) {
  try {
    const batch = await DeliveryBatch.findById(req.params.id)
      .populate('createdBy', 'name')
      .populate('orderId', 'orderNo')

    if (!batch) {
      res.status(404).json({
        success: false,
        message: 'Batch not found.',
      })
      return
    }

    res.json({
      success: true,
      batch: serializeBatch(batch),
    })
  } catch (error) {
    next(error)
  }
}

export async function updateBatch(
  req: Request<{ id: string }, unknown, BatchBody>,
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

    const batch = await DeliveryBatch.findById(req.params.id)
    if (!batch) {
      res.status(404).json({
        success: false,
        message: 'Batch not found.',
      })
      return
    }

    const order = await ProductionOrder.findById(batch.orderId)
    if (!order) {
      res.status(404).json({
        success: false,
        message: 'Order not found.',
      })
      return
    }

    if (req.body.batchNo !== undefined) {
      const nextBatchNo = String(req.body.batchNo).trim()
      if (!nextBatchNo) {
        res.status(400).json({
          success: false,
          message: 'Batch number is required.',
        })
        return
      }

      const duplicate = await DeliveryBatch.findOne({
        orderId: order._id,
        batchNo: nextBatchNo,
        _id: { $ne: batch._id },
      })
      if (duplicate) {
        res.status(409).json({
          success: false,
          message: `Batch ${nextBatchNo} already exists for this order.`,
        })
        return
      }

      batch.batchNo = nextBatchNo
    }

    if (req.body.plannedQuantity !== undefined) {
      const plannedQuantity = toNumber(req.body.plannedQuantity)
      if (!plannedQuantity || plannedQuantity < 1) {
        res.status(400).json({
          success: false,
          message: 'Planned quantity must be at least 1.',
        })
        return
      }

      const allocated = await allocationForOrder(order._id, batch._id.toString())
      const remaining = order.totalQuantity - allocated
      if (plannedQuantity > remaining) {
        res.status(400).json({
          success: false,
          message: `Planned quantity exceeds remaining order qty (${remaining} pcs).`,
        })
        return
      }

      batch.plannedQuantity = plannedQuantity
    }

    if (req.body.bufferQty !== undefined) {
      batch.bufferQty = toNumber(req.body.bufferQty) ?? 0
    }

    if (req.body.totalBatchQty !== undefined) {
      batch.totalBatchQty = toNumber(req.body.totalBatchQty) ?? batch.plannedQuantity
    } else {
      batch.totalBatchQty = batch.plannedQuantity + (batch.bufferQty ?? 0)
    }

    if (req.body.targetDispatchDate !== undefined) {
      const targetDispatchDate = new Date(String(req.body.targetDispatchDate))
      if (Number.isNaN(targetDispatchDate.getTime())) {
        res.status(400).json({
          success: false,
          message: 'Enter a valid target dispatch date.',
        })
        return
      }
      batch.targetDispatchDate = targetDispatchDate
    }

    if (req.body.priority !== undefined) {
      batch.priority = mapPriority(req.body.priority)
    }

    if (req.body.status !== undefined) {
      const status = mapStatus(req.body.status)
      if (!status) {
        res.status(400).json({
          success: false,
          message: 'Invalid batch status.',
        })
        return
      }
      batch.status = status
    }

    if (req.body.completedQuantity !== undefined) {
      batch.completedQuantity = Math.max(toNumber(req.body.completedQuantity) ?? 0, 0)
    }

    if (req.body.dispatchedQuantity !== undefined) {
      batch.dispatchedQuantity = Math.max(toNumber(req.body.dispatchedQuantity) ?? 0, 0)
    }

    if (req.body.progressPercent !== undefined) {
      const percent = toNumber(req.body.progressPercent) ?? 0
      batch.progressPercent = Math.min(Math.max(percent, 0), 100)
    } else if (batch.plannedQuantity > 0) {
      batch.progressPercent = Number(
        ((batch.completedQuantity / batch.plannedQuantity) * 100).toFixed(2),
      )
    }

    await batch.save()
    const populated = await batch.populate('createdBy', 'name')
    const allocated = await allocationForOrder(order._id)

    res.json({
      success: true,
      message: 'Batch updated successfully.',
      batch: serializeBatch(populated, order.orderNo),
      allocation: {
        orderQty: order.totalQuantity,
        allocated,
        remaining: Math.max(order.totalQuantity - allocated, 0),
      },
    })
  } catch (error) {
    next(error)
  }
}

export async function assignBatch(
  req: Request<{ orderId?: string; batchId?: string }>,
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

    const batchId = String(req.params.batchId ?? req.body.batchId ?? '').trim()
    const employeeId = String(req.body.employeeId ?? '').trim()
    const shift = String(req.body.shift ?? '').trim().toUpperCase()

    if (!batchId || !employeeId || !shift) {
      res.status(400).json({
        success: false,
        message: 'Batch, employee, and shift are required.',
      })
      return
    }

    const batch = await DeliveryBatch.findById(batchId)
    if (!batch) {
      res.status(404).json({
        success: false,
        message: 'Batch not found.',
      })
      return
    }

    const employee = await User.findById(employeeId)
    if (!employee || employee.status !== 'ACTIVE') {
      res.status(400).json({
        success: false,
        message: 'Selected employee was not found.',
      })
      return
    }

    const alreadyAssigned = batch.assignments.some(
      (item) =>
        item.employeeId.toString() === employee._id.toString() &&
        item.shift === shift,
    )
    if (alreadyAssigned) {
      res.status(400).json({
        success: false,
        message: `${employee.name} is already assigned to shift ${shift}.`,
      })
      return
    }

    batch.assignments.push({
      employeeId: employee._id,
      employeeName: employee.name,
      shift,
      assignedAt: new Date(),
    })
    await batch.save()

    res.json({
      success: true,
      message: 'Employee assigned to batch.',
      batch: serializeBatch(batch, batch.orderNo),
    })
  } catch (error) {
    next(error)
  }
}

export async function logBatchTime(
  req: Request<{ orderId?: string; batchId?: string }>,
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

    const batchId = String(req.params.batchId ?? req.body.batchId ?? '').trim()
    const employeeId = String(req.body.employeeId ?? '').trim()
    const shift = String(req.body.shift ?? '').trim().toUpperCase()
    const hours = toNumber(req.body.hours)
    const note = String(req.body.note ?? '').trim()

    if (!batchId || !employeeId || !shift) {
      res.status(400).json({
        success: false,
        message: 'Batch, employee, and shift are required.',
      })
      return
    }

    if (hours === undefined || hours < 0) {
      res.status(400).json({
        success: false,
        message: 'Hours cannot be negative.',
      })
      return
    }

    const batch = await DeliveryBatch.findById(batchId)
    if (!batch) {
      res.status(404).json({
        success: false,
        message: 'Batch not found.',
      })
      return
    }

    const employee = await User.findById(employeeId)
    if (!employee || employee.status !== 'ACTIVE') {
      res.status(400).json({
        success: false,
        message: 'Selected employee was not found.',
      })
      return
    }

    batch.timeLogs.push({
      employeeId: employee._id,
      employeeName: employee.name,
      shift,
      hours,
      note,
      loggedAt: new Date(),
    })
    await batch.save()

    res.json({
      success: true,
      message: 'Time logged.',
      batch: serializeBatch(batch, batch.orderNo),
    })
  } catch (error) {
    next(error)
  }
}
