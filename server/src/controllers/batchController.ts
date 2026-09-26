import type { NextFunction, Request, Response } from 'express'
import mongoose from 'mongoose'
import {
  BATCH_STATUSES,
  ORDER_PRIORITIES,
  type BatchStatus,
  type OrderPriority,
} from '../constants/enums'
import { DeliveryBatch } from '../models/DeliveryBatch'
import { Machine } from '../models/Machine'
import { ProductionOrder } from '../models/ProductionOrder'
import { User } from '../models/User'
import { buildBatchSerials } from '../utils/serialNumber'

interface BatchBody {
  orderId?: string
  orderNo?: string
  productId?: string
  processStepName?: string
  machineIds?: string[] | string
  processMachines?: Array<{
    processStepName?: string
    sequence?: number
    machineId?: string
  }>
  deferSerials?: boolean | string
  productionInCharge?: string
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
      currentProcessStepName?: string
      completedPercent?: number
      comments?: string
      machineId?: { toString(): string }
      machineCode?: string
      shift?: string
      operatorId?: { toString(): string }
      operatorName?: string
    }>
    assignedMachines?: Array<{
      machineId: { toString(): string }
      machineCode: string
      machineName: string
    }>
    processMachines?: Array<{
      processStepName: string
      sequence: number
      machineId?: { toString(): string }
      machineCode?: string
      machineName?: string
    }>
    processStepNames?: string[]
    productDescription?: string
    drawingNumber?: string
    lineNumber?: number
    productionInCharge?: string
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

  const serials = (batch.serials ?? []).map((item) => ({
    serialNumber: item.serialNumber,
    sequence: item.sequence,
    status: item.status,
    currentProcessStepName: item.currentProcessStepName ?? '',
    completedPercent: item.completedPercent ?? 0,
    comments: item.comments ?? '',
    machineId: item.machineId ? String(item.machineId) : '',
    machineCode: item.machineCode ?? '',
    shift: item.shift ?? '',
    operatorId: item.operatorId ? String(item.operatorId) : '',
    operatorName: item.operatorName ?? '',
  }))
  const assignedMachines = (batch.assignedMachines ?? []).map((item) => ({
    machineId: item.machineId.toString(),
    machineCode: item.machineCode,
    machineName: item.machineName,
  }))
  const processMachines = (batch.processMachines ?? []).map((item) => ({
    processStepName: item.processStepName,
    sequence: item.sequence,
    machineId: item.machineId ? String(item.machineId) : '',
    machineCode: item.machineCode ?? '',
    machineName: item.machineName ?? '',
  }))
  const processStepNames = (batch.processStepNames ?? []).filter(Boolean)
  if (batch.processStepName && !processStepNames.includes(batch.processStepName)) {
    processStepNames.push(batch.processStepName)
  }
  for (const item of processMachines) {
    if (item.processStepName && !processStepNames.includes(item.processStepName)) {
      processStepNames.push(item.processStepName)
    }
  }

  return {
    id: batch._id.toString(),
    orderId: order?._id?.toString() ?? String(batch.orderId),
    orderNo: orderNo ?? order?.orderNo ?? '',
    productId: batch.productId ? String(batch.productId) : '',
    productName: batch.productName ?? '',
    productDescription: batch.productDescription ?? '',
    drawingNumber: batch.drawingNumber ?? '',
    lineNumber: batch.lineNumber ?? null,
    processStepName: batch.processStepName ?? '',
    batchNo: batch.batchNo,
    plannedQuantity: batch.plannedQuantity,
    bufferQty: batch.bufferQty ?? 0,
    totalBatchQty: batch.totalBatchQty,
    targetDispatchDate: batch.targetDispatchDate,
    priority: batch.priority,
    status: batch.status,
    productionInCharge: batch.productionInCharge ?? '',
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
    serials,
    serialCount: serials.length,
    assignedMachines,
    processMachines,
    processStepNames,
    processQtys: processWiseQtys({
      plannedQuantity: batch.plannedQuantity,
      processStepName: batch.processStepName ?? '',
      processStepNames,
      processMachines,
      serials,
    }),
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

function processWiseQtys(batch: {
  plannedQuantity: number
  processStepName: string
  processStepNames: string[]
  processMachines?: Array<{ processStepName: string; sequence: number }>
  serials: Array<{
    status: string
    currentProcessStepName?: string
  }>
}) {
  const serials = batch.serials
  const namedSteps =
    batch.processMachines && batch.processMachines.length > 0
      ? batch.processMachines
          .slice()
          .sort((a, b) => a.sequence - b.sequence)
          .map((item) => item.processStepName)
      : [...batch.processStepNames]
  if (batch.processStepName && !namedSteps.includes(batch.processStepName)) {
    namedSteps.push(batch.processStepName)
  }

  function stepOf(serial: { status: string; currentProcessStepName?: string }) {
    if (serial.currentProcessStepName) return serial.currentProcessStepName
    if (
      serial.status === 'COMPLETED' ||
      serial.status === 'FULL_READY' ||
      serial.status === 'QC_REJECTED'
    ) {
      return ''
    }
    return batch.processStepName || namedSteps[0] || ''
  }

  const notStarted = serials.filter(
    (serial) =>
      serial.status === 'QUEUED' &&
      !serial.currentProcessStepName &&
      !batch.processStepName &&
      namedSteps.length === 0,
  ).length

  const stepsSource =
    namedSteps.length > 0
      ? namedSteps
      : batch.processStepName
        ? [batch.processStepName]
        : ['Whole product']
  const noNamedSteps = namedSteps.length === 0

  return {
    total: batch.plannedQuantity,
    notStarted,
    qcRejected: serials.filter((serial) => serial.status === 'QC_REJECTED').length,
    fullReady: serials.filter(
      (serial) =>
        serial.status === 'FULL_READY' || serial.status === 'COMPLETED',
    ).length,
    steps: stepsSource.map((name, index) => {
      const sequence =
        batch.processMachines?.find((item) => item.processStepName === name)
          ?.sequence ?? index + 1
      const queue = serials.filter(
        (serial) =>
          (serial.status === 'QUEUED' || serial.status === 'ON_HOLD') &&
          (noNamedSteps || stepOf(serial) === name),
      ).length
      const inProgress = serials.filter(
        (serial) =>
          serial.status === 'IN_PROGRESS' &&
          (noNamedSteps || stepOf(serial) === name),
      ).length
      const completed = serials.filter(
        (serial) =>
          (serial.status === 'COMPLETED' || serial.status === 'FULL_READY') &&
          (noNamedSteps ||
            serial.currentProcessStepName === name ||
            (!serial.currentProcessStepName &&
              name === stepsSource[stepsSource.length - 1])),
      ).length
      const qcRejected = serials.filter(
        (serial) =>
          serial.status === 'QC_REJECTED' &&
          (noNamedSteps || stepOf(serial) === name),
      ).length
      let status = 'Not started'
      if (qcRejected > 0) status = 'QC rejected'
      else if (inProgress > 0) status = 'In progress'
      else if (queue > 0) status = 'Queue'
      else if (completed > 0) status = 'Completed'
      return {
        name,
        sequence,
        status,
        queue,
        inProgress,
        qcRejected,
        completed,
        fullReady: completed,
      }
    }),
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

    const deferSerials =
      req.body.deferSerials === true ||
      req.body.deferSerials === 'true' ||
      String(req.body.status ?? '').toUpperCase() === 'CREATED'
    const firstProcessName =
      processStepName ||
      (productLine?.processSteps ?? [])[0]?.name ||
      ''

    const serials = deferSerials
      ? []
      : buildBatchSerials({
          orderNo: order.orderNo,
          batchNo,
          quantity: plannedQuantity,
          startSequence: await nextSerialSequence(order._id),
          currentProcessStepName: firstProcessName,
        })

    const processStepNames = (productLine?.processSteps ?? [])
      .map((step) => String(step.name ?? '').trim())
      .filter(Boolean)

    const requestedByStep = new Map(
      (Array.isArray(req.body.processMachines) ? req.body.processMachines : [])
        .map((item) => [String(item.processStepName ?? '').trim().toLowerCase(), item]),
    )
    const stepSources = (productLine?.processSteps ?? []).filter((step) => {
      if (!processStepName) return true
      return step.name.toLowerCase() === processStepName.toLowerCase()
    })
    const processMachines = []
    for (const step of stepSources) {
      const requested = requestedByStep.get(step.name.toLowerCase())
      const machineId = String(
        requested?.machineId ?? step.machineId?.toString() ?? '',
      ).trim()
      const machine =
        machineId && looksLikeObjectId(machineId)
          ? await Machine.findById(machineId)
          : null
      processMachines.push({
        processStepName: step.name,
        sequence: step.sequence,
        machineId: machine?._id,
        machineCode: machine?.machineCode ?? step.machineCode ?? '',
        machineName: machine?.name ?? step.machineName ?? '',
      })
    }

    const assignedById = new Map<
      string,
      { machineId: mongoose.Types.ObjectId; machineCode: string; machineName: string }
    >()
    for (const item of processMachines) {
      if (!item.machineId) continue
      assignedById.set(item.machineId.toString(), {
        machineId: item.machineId,
        machineCode: item.machineCode,
        machineName: item.machineName,
      })
    }
    const assignedMachines = [...assignedById.values()]

    const batch = await DeliveryBatch.create({
      orderId: order._id,
      orderNo: order.orderNo,
      productId: productLine?.productId,
      productName: productLine?.productName ?? order.productNameSnapshot ?? '',
      productDescription: productLine?.description ?? '',
      drawingNumber: productLine?.drawingNumber ?? '',
      lineNumber: productLine?.lineNumber,
      processStepName,
      processStepNames,
      processMachines,
      batchNo,
      plannedQuantity,
      bufferQty,
      totalBatchQty,
      targetDispatchDate,
      priority: mapPriority(req.body.priority),
      status: mapStatus(req.body.status) ?? (deferSerials ? 'CREATED' : 'SCHEDULED'),
      productionInCharge: String(req.body.productionInCharge ?? '').trim(),
      completedQuantity: 0,
      dispatchedQuantity: 0,
      progressPercent: 0,
      assignments: [],
      timeLogs: [],
      serials,
      assignedMachines,
      createdBy: req.user._id,
    })

    if (order.status === 'DRAFT' || order.status === 'RELEASED') {
      order.status = 'IN_PRODUCTION'
      await order.save()
    }
    if (productLine) {
      productLine.lineStatus = 'IN_PRODUCTION'
      await order.save()
    }

    const populated = await batch.populate('createdBy', 'name')

    res.status(201).json({
      success: true,
      message: deferSerials
        ? `Batch ${batchNo} created. Activate to generate serial numbers.`
        : `Batch ${batchNo} created with ${serials.length} serial numbers.`,
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

export async function activateBatch(
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
    if (!batchId || !looksLikeObjectId(batchId)) {
      res.status(400).json({ success: false, message: 'Batch ID is required.' })
      return
    }

    const batch = await DeliveryBatch.findById(batchId)
    if (!batch) {
      res.status(404).json({ success: false, message: 'Batch not found.' })
      return
    }

    if (batch.status !== 'CREATED' && (batch.serials?.length ?? 0) > 0) {
      res.status(400).json({
        success: false,
        message: 'Batch is already active with serial numbers.',
      })
      return
    }

    const processMachines = Array.isArray(req.body.processMachines)
      ? req.body.processMachines
      : []
    if (processMachines.length > 0) {
      const nextMachines = []
      for (const item of processMachines) {
        const processStepName = String(item.processStepName ?? '').trim()
        const sequence: number =
          toNumber(item.sequence) ?? nextMachines.length + 1
        const machineId = String(item.machineId ?? '').trim()
        if (!processStepName) continue
        let machineCode = ''
        let machineName = ''
        let machineObjectId: mongoose.Types.ObjectId | undefined
        if (machineId && looksLikeObjectId(machineId)) {
          const machine = await Machine.findById(machineId)
          if (machine) {
            machineObjectId = machine._id
            machineCode = machine.machineCode
            machineName = machine.name
          }
        }
        nextMachines.push({
          processStepName,
          sequence,
          machineId: machineObjectId,
          machineCode,
          machineName,
        })
      }
      if (nextMachines.length > 0) {
        batch.processMachines = nextMachines
        batch.processStepNames = nextMachines.map((item) => item.processStepName)
      }
    }

    if (req.body.productionInCharge !== undefined) {
      batch.productionInCharge = String(req.body.productionInCharge ?? '').trim()
    }

    const firstStep =
      batch.processMachines[0]?.processStepName ||
      batch.processStepNames[0] ||
      batch.processStepName ||
      ''

    if ((batch.serials?.length ?? 0) === 0) {
      batch.serials = buildBatchSerials({
        orderNo: batch.orderNo,
        batchNo: batch.batchNo,
        quantity: batch.plannedQuantity,
        startSequence: await nextSerialSequence(batch.orderId),
        currentProcessStepName: firstStep,
      })
    } else {
      for (const serial of batch.serials) {
        if (!serial.currentProcessStepName) {
          serial.currentProcessStepName = firstStep
        }
      }
    }

    batch.status = 'ACTIVE'
    await batch.save()
    const populated = await batch.populate('createdBy', 'name')

    res.json({
      success: true,
      message: `Batch ${batch.batchNo} activated with ${batch.serials.length} serial records.`,
      batch: serializeBatch(populated, batch.orderNo),
    })
  } catch (error) {
    next(error)
  }
}

export async function updateBatchSerials(
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

    const batchId = String(req.params.batchId ?? '').trim()
    const updates = Array.isArray(req.body.updates) ? req.body.updates : []
    if (!batchId || !looksLikeObjectId(batchId)) {
      res.status(400).json({ success: false, message: 'Batch ID is required.' })
      return
    }
    if (updates.length === 0) {
      res.status(400).json({
        success: false,
        message: 'Select at least one serial to update.',
      })
      return
    }

    const batch = await DeliveryBatch.findById(batchId)
    if (!batch) {
      res.status(404).json({ success: false, message: 'Batch not found.' })
      return
    }

    const employeeId = String(req.body.operatorId ?? req.user._id).trim()
    const employee = await User.findById(employeeId)
    const shift = String(req.body.shift ?? '').trim().toUpperCase()
    const machineId = String(req.body.machineId ?? '').trim()
    let machineCode = ''
    if (machineId && looksLikeObjectId(machineId)) {
      const machine = await Machine.findById(machineId)
      machineCode = machine?.machineCode ?? ''
    }

    const order = await ProductionOrder.findById(batch.orderId).lean()
    const productLine = order?.products?.find(
      (line) =>
        batch.productId &&
        line.productId &&
        String(line.productId) === String(batch.productId),
    )
    const hoursByStep = new Map(
      (productLine?.processSteps ?? order?.processSteps ?? []).map((step) => [
        step.name,
        Number(step.hoursPerPiece) || 0,
      ]),
    )

    const bySerial = new Map(
      updates.map((item: { serialNumber?: string }) => [
        String(item.serialNumber ?? '').trim(),
        item,
      ]),
    )

    let derivedHours = 0
    for (const serial of batch.serials) {
      const update = bySerial.get(serial.serialNumber)
      if (!update) continue
      const previousPercent = Number(serial.completedPercent) || 0
      const status = String(
        (update as { status?: string }).status ?? serial.status,
      )
        .trim()
        .toUpperCase()
      if (
        [
          'QUEUED',
          'IN_PROGRESS',
          'COMPLETED',
          'ON_HOLD',
          'QC_REJECTED',
          'FULL_READY',
        ].includes(status)
      ) {
        serial.status = status as typeof serial.status
      }
      if ((update as { currentProcessStepName?: string }).currentProcessStepName !== undefined) {
        serial.currentProcessStepName = String(
          (update as { currentProcessStepName?: string }).currentProcessStepName ?? '',
        ).trim()
      }
      const percent = toNumber((update as { completedPercent?: number }).completedPercent)
      if (percent !== undefined) {
        serial.completedPercent = Math.max(0, Math.min(100, percent))
      }
      if (status === 'COMPLETED' || status === 'FULL_READY') {
        serial.completedPercent = 100
      }
      if ((update as { comments?: string }).comments !== undefined) {
        serial.comments = String((update as { comments?: string }).comments ?? '').trim()
      }
      if (shift) serial.shift = shift
      if (machineCode) {
        serial.machineCode = machineCode
        if (looksLikeObjectId(machineId)) {
          serial.machineId = new mongoose.Types.ObjectId(machineId)
        }
      }
      if (employee) {
        serial.operatorId = employee._id
        serial.operatorName = employee.name
      }

      const stepName =
        serial.currentProcessStepName ||
        batch.processStepName ||
        batch.processStepNames[0] ||
        ''
      const hoursPerPiece = hoursByStep.get(stepName) ?? 0
      const nextPercent = Number(serial.completedPercent) || 0
      const delta = Math.max(0, nextPercent - previousPercent)
      derivedHours += (delta / 100) * hoursPerPiece
    }

    if (employee && derivedHours > 0) {
      batch.timeLogs.push({
        employeeId: employee._id,
        employeeName: employee.name,
        shift: shift || 'A',
        hours: Math.round(derivedHours * 100) / 100,
        note: 'Derived from completed %',
        loggedAt: new Date(),
      })
    }

    const completed = batch.serials.filter(
      (item) => item.status === 'COMPLETED' || item.status === 'FULL_READY',
    ).length
    batch.completedQuantity = completed
    batch.progressPercent = Math.round(
      (completed / Math.max(1, batch.plannedQuantity)) * 100,
    )
    await batch.save()

    res.json({
      success: true,
      message:
        derivedHours > 0
          ? `Serial progress updated (${Math.round(derivedHours * 100) / 100}h derived).`
          : 'Serial progress updated.',
      batch: serializeBatch(batch, batch.orderNo),
    })
  } catch (error) {
    next(error)
  }
}

export async function assignSerialsToShift(
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

    const batchId = String(req.params.batchId ?? '').trim()
    const serialNumbers = Array.isArray(req.body.serialNumbers)
      ? req.body.serialNumbers.map((item: string) => String(item).trim())
      : []
    const shift = String(req.body.shift ?? '').trim().toUpperCase()
    const machineId = String(req.body.machineId ?? '').trim()
    const operatorId = String(req.body.operatorId ?? '').trim()
    const processStepName = String(req.body.processStepName ?? '').trim()

    if (!batchId || serialNumbers.length === 0 || !shift) {
      res.status(400).json({
        success: false,
        message: 'Batch, serials, and shift are required.',
      })
      return
    }

    const batch = await DeliveryBatch.findById(batchId)
    if (!batch) {
      res.status(404).json({ success: false, message: 'Batch not found.' })
      return
    }

    let machineCode = ''
    let machineObjectId: mongoose.Types.ObjectId | undefined
    if (machineId && looksLikeObjectId(machineId)) {
      const machine = await Machine.findById(machineId)
      if (machine) {
        machineObjectId = machine._id
        machineCode = machine.machineCode
      }
    }

    let operatorName = ''
    let operatorObjectId: mongoose.Types.ObjectId | undefined
    if (operatorId && looksLikeObjectId(operatorId)) {
      const operator = await User.findById(operatorId)
      if (operator) {
        operatorObjectId = operator._id
        operatorName = operator.name
      }
    }

    const selected = new Set(serialNumbers)
    for (const serial of batch.serials) {
      if (!selected.has(serial.serialNumber)) continue
      serial.shift = shift
      if (processStepName) serial.currentProcessStepName = processStepName
      if (machineObjectId) {
        serial.machineId = machineObjectId
        serial.machineCode = machineCode
      }
      if (operatorObjectId) {
        serial.operatorId = operatorObjectId
        serial.operatorName = operatorName
      }
      if (serial.status === 'QUEUED') {
        // keep queued until operator starts
      }
    }

    if (operatorObjectId && operatorName) {
      const already = batch.assignments.some(
        (item) =>
          item.employeeId.toString() === operatorObjectId!.toString() &&
          item.shift === shift,
      )
      if (!already) {
        batch.assignments.push({
          employeeId: operatorObjectId,
          employeeName: operatorName,
          shift,
          assignedAt: new Date(),
        })
      }
    }

    await batch.save()
    res.json({
      success: true,
      message: 'Serials assigned to machine and shift.',
      batch: serializeBatch(batch, batch.orderNo),
    })
  } catch (error) {
    next(error)
  }
}
