import type { NextFunction, Request, Response } from 'express'
import mongoose from 'mongoose'
import { DeliveryBatch } from '../models/DeliveryBatch'
import { Machine } from '../models/Machine'
import { ProcessStep } from '../models/ProcessStep'
import { Product } from '../models/Product'
import { ProductionPlan, PLAN_STATUSES, type PlanStatus } from '../models/ProductionPlan'
import { Shift } from '../models/Shift'
import { User } from '../models/User'

function looksLikeObjectId(value: string): boolean {
  return mongoose.Types.ObjectId.isValid(value) && value.length === 24
}

function planNoDatePrefix(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `PLN-${year}${month}${day}-`
}

async function generatePlanNo(planDate?: Date): Promise<string> {
  const prefix = planNoDatePrefix(planDate ?? new Date())
  const latest = await ProductionPlan.findOne({
    planNo: { $regex: `^${prefix}` },
  })
    .sort({ planNo: -1 })
    .select('planNo')
    .lean()

  let next = 1
  if (latest?.planNo) {
    const suffix = latest.planNo.slice(prefix.length)
    const parsed = Number.parseInt(suffix, 10)
    if (Number.isFinite(parsed) && parsed >= next) {
      next = parsed + 1
    }
  }

  return `${prefix}${String(next).padStart(4, '0')}`
}

function serializePlan(doc: any) {
  const planDateStr = doc.planDate instanceof Date ? doc.planDate.toISOString().slice(0, 10) : doc.planDate
  const startDateStr = doc.startDate
    ? (doc.startDate instanceof Date ? doc.startDate.toISOString().slice(0, 10) : doc.startDate)
    : planDateStr
  const endDateStr = doc.endDate
    ? (doc.endDate instanceof Date ? doc.endDate.toISOString().slice(0, 10) : doc.endDate)
    : planDateStr

  return {
    id: doc._id.toString(),
    planNo: doc.planNo,
    batchId: doc.batchId?.toString(),
    batchNo: doc.batchNo,
    orderId: doc.orderId?.toString(),
    orderNo: doc.orderNo ?? '',
    productId: doc.productId?.toString(),
    productCode: doc.productCode,
    productName: doc.productName,
    planDate: planDateStr,
    startDate: startDateStr,
    endDate: endDateStr,
    shift: doc.shift,
    processStepId: doc.processStepId?.toString(),
    processStepName: doc.processStepName,
    processStepInfo: doc.processStepInfo ?? '',
    process: doc.process,
    machineId: doc.machineId?.toString(),
    machineCode: doc.machineCode,
    machineName: doc.machineName,
    operatorId: doc.operatorId?.toString(),
    operatorCode: doc.operatorCode ?? '',
    operatorName: doc.operatorName,
    plannedQuantity: doc.plannedQuantity,
    status: doc.status,
    actualQuantity: doc.actualQuantity ?? 0,
    rejectedQuantity: doc.rejectedQuantity ?? 0,
    reworkQuantity: doc.reworkQuantity ?? 0,
    notes: doc.notes ?? '',
    startedAt: doc.startedAt,
    completedAt: doc.completedAt,
    createdBy: doc.createdBy?.toString(),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }
}

/**
 * GET /api/planning
 * List production plans with optional filtering
 */
export async function listPlans(req: Request, res: Response, next: NextFunction) {
  try {
    const { date, shift, machineId, operatorId, batchId, status, search } = req.query
    const query: Record<string, any> = {}

    if (date && typeof date === 'string') {
      const d = new Date(date)
      if (!Number.isNaN(d.getTime())) {
        const start = new Date(d)
        start.setUTCHours(0, 0, 0, 0)
        const end = new Date(d)
        end.setUTCHours(23, 59, 59, 999)
        query.$or = [
          { planDate: { $gte: start, $lte: end } },
          {
            $and: [
              { startDate: { $lte: end } },
              { endDate: { $gte: start } },
            ],
          },
        ]
      }
    }

    if (shift && typeof shift === 'string') {
      query.shift = shift
    }

    if (machineId && typeof machineId === 'string' && looksLikeObjectId(machineId)) {
      query.machineId = machineId
    }

    if (operatorId && typeof operatorId === 'string' && looksLikeObjectId(operatorId)) {
      query.operatorId = operatorId
    }

    if (batchId && typeof batchId === 'string') {
      if (looksLikeObjectId(batchId)) {
        query.batchId = batchId
      } else {
        query.batchNo = batchId
      }
    }

    if (status && typeof status === 'string' && status !== 'ALL') {
      query.status = status.toUpperCase()
    }

    if (search && typeof search === 'string') {
      const regex = new RegExp(search.trim(), 'i')
      query.$or = [
        { planNo: regex },
        { batchNo: regex },
        { productCode: regex },
        { productName: regex },
        { machineCode: regex },
        { machineName: regex },
        { operatorName: regex },
        { process: regex },
        { processStepName: regex },
      ]
    }

    const plans = await ProductionPlan.find(query)
      .sort({ planDate: -1, createdAt: -1 })
      .lean()

    res.json({
      success: true,
      plans: plans.map(serializePlan),
    })
  } catch (error) {
    next(error)
  }
}

/**
 * GET /api/planning/options
 * Returns active batches, products, process steps, machines, operators, and shifts
 * to populate planning selects and assist in reactive auto-fill.
 */
export async function getPlanningOptions(_req: Request, res: Response, next: NextFunction) {
  try {
    const [batches, products, processSteps, machines, users, shifts] = await Promise.all([
      DeliveryBatch.find()
        .sort({ createdAt: -1 })
        .select('batchNo orderNo orderId productId productName plannedQuantity processStepNames processMachines')
        .lean(),
      Product.find({ status: 'ACTIVE' })
        .sort({ productCode: 1 })
        .select('productCode name uom productType')
        .lean(),
      ProcessStep.find({ status: 'ACTIVE' })
        .sort({ sequence: 1, name: 1 })
        .select('code name category standardHoursPerPiece')
        .lean(),
      Machine.find({ active: true })
        .sort({ machineCode: 1 })
        .select('machineCode name machineType bay status maintenanceStatus')
        .lean(),
      User.find({ status: 'ACTIVE' })
        .sort({ name: 1 })
        .select('employeeCode name role phone')
        .lean(),
      Shift.find({ status: 'ACTIVE' })
        .sort({ shiftCode: 1 })
        .select('shiftCode name startTime endTime')
        .lean(),
    ])

    const defaultShifts =
      shifts.length > 0
        ? shifts.map((s) => ({
            shiftCode: s.shiftCode,
            name: s.name,
            startTime: s.startTime,
            endTime: s.endTime,
          }))
        : [
            { shiftCode: 'A', name: 'Shift A (06:00 - 14:00)', startTime: '06:00', endTime: '14:00' },
            { shiftCode: 'B', name: 'Shift B (14:00 - 22:00)', startTime: '14:00', endTime: '22:00' },
            { shiftCode: 'C', name: 'Shift C (22:00 - 06:00)', startTime: '22:00', endTime: '06:00' },
          ]

    res.json({
      success: true,
      options: {
        batches: batches.map((b) => ({
          id: b._id.toString(),
          batchNo: b.batchNo,
          orderNo: b.orderNo ?? '',
          orderId: b.orderId?.toString() ?? '',
          productId: b.productId?.toString() ?? '',
          productName: b.productName ?? '',
          plannedQuantity: b.plannedQuantity,
          processStepNames: b.processStepNames ?? [],
          processMachines: b.processMachines ?? [],
        })),
        products: products.map((p) => ({
          id: p._id.toString(),
          productCode: p.productCode,
          name: p.name,
          uom: p.uom,
          productType: p.productType,
        })),
        processSteps: processSteps.map((s) => ({
          id: s._id.toString(),
          code: s.code,
          name: s.name,
          category: s.category,
          standardHoursPerPiece: s.standardHoursPerPiece,
        })),
        machines: machines.map((m) => ({
          id: m._id.toString(),
          machineCode: m.machineCode,
          name: m.name,
          machineType: m.machineType,
          bay: m.bay ?? '',
          status: m.status,
          maintenanceStatus: m.maintenanceStatus,
        })),
        operators: users.map((u) => ({
          id: u._id.toString(),
          employeeCode: u.employeeCode,
          name: u.name,
          role: u.role,
        })),
        shifts: defaultShifts,
      },
    })
  } catch (error) {
    next(error)
  }
}

/**
 * GET /api/planning/:id
 * Retrieve a single plan by ID
 */
export async function getPlan(req: Request<{ id: string }>, res: Response, next: NextFunction) {
  try {
    const plan = await ProductionPlan.findById(req.params.id).lean()
    if (!plan) {
      res.status(404).json({ success: false, message: 'Production plan not found.' })
      return
    }

    res.json({
      success: true,
      plan: serializePlan(plan),
    })
  } catch (error) {
    next(error)
  }
}

/**
 * POST /api/planning
 * Create a new Production Plan
 */
export async function createPlan(req: Request, res: Response, next: NextFunction) {
  try {
    const {
      batchId,
      productId,
      planDate,
      startDate,
      endDate,
      shift,
      processStepId,
      processStepName,
      processStepInfo,
      process,
      machineId,
      operatorId,
      plannedQuantity,
      notes,
      status,
    } = req.body

    // Validations
    if (!batchId || !looksLikeObjectId(batchId)) {
      res.status(400).json({ success: false, message: 'Valid Prod Batch is required.' })
      return
    }

    if (!productId || !looksLikeObjectId(productId)) {
      res.status(400).json({ success: false, message: 'Valid Product is required.' })
      return
    }

    const effectiveStartDate = startDate || planDate
    const effectiveEndDate = endDate || effectiveStartDate

    if (!effectiveStartDate) {
      res.status(400).json({ success: false, message: 'Start date is required.' })
      return
    }

    const parsedStartDate = new Date(effectiveStartDate)
    if (Number.isNaN(parsedStartDate.getTime())) {
      res.status(400).json({ success: false, message: 'Invalid start date.' })
      return
    }

    const parsedEndDate = new Date(effectiveEndDate)
    if (Number.isNaN(parsedEndDate.getTime())) {
      res.status(400).json({ success: false, message: 'Invalid end date.' })
      return
    }

    if (parsedEndDate < parsedStartDate) {
      res.status(400).json({ success: false, message: 'End date cannot be earlier than start date.' })
      return
    }

    if (!shift || !String(shift).trim()) {
      res.status(400).json({ success: false, message: 'Shift is required.' })
      return
    }

    if (!processStepName || !String(processStepName).trim()) {
      res.status(400).json({ success: false, message: 'Process Step is required.' })
      return
    }

    if (!process || !String(process).trim()) {
      res.status(400).json({ success: false, message: 'Process is required.' })
      return
    }

    if (!machineId || !looksLikeObjectId(machineId)) {
      res.status(400).json({ success: false, message: 'Valid Machine is required.' })
      return
    }

    if (!operatorId || !looksLikeObjectId(operatorId)) {
      res.status(400).json({ success: false, message: 'Valid Operator is required.' })
      return
    }

    const qty = Number(plannedQuantity)
    if (!qty || qty <= 0 || !Number.isInteger(qty)) {
      res.status(400).json({ success: false, message: 'Planned quantity must be a positive integer.' })
      return
    }

    // Resolve entities
    const [batch, product, machine, operator] = await Promise.all([
      DeliveryBatch.findById(batchId),
      Product.findById(productId),
      Machine.findById(machineId),
      User.findById(operatorId),
    ])

    if (!batch) {
      res.status(404).json({ success: false, message: 'Production Batch not found.' })
      return
    }

    if (!product) {
      res.status(404).json({ success: false, message: 'Product not found.' })
      return
    }

    if (!machine) {
      res.status(404).json({ success: false, message: 'Machine not found.' })
      return
    }

    if (!operator) {
      res.status(404).json({ success: false, message: 'Operator not found.' })
      return
    }

    const planNo = await generatePlanNo(parsedStartDate)

    const initialStatus: PlanStatus =
      status && PLAN_STATUSES.includes(status.toUpperCase()) ? status.toUpperCase() : 'PLANNED'

    const plan = await ProductionPlan.create({
      planNo,
      batchId: batch._id,
      batchNo: batch.batchNo,
      orderId: batch.orderId,
      orderNo: batch.orderNo ?? '',
      productId: product._id,
      productCode: product.productCode,
      productName: product.name,
      planDate: parsedStartDate,
      startDate: parsedStartDate,
      endDate: parsedEndDate,
      shift: String(shift).trim(),
      processStepId: looksLikeObjectId(processStepId) ? processStepId : undefined,
      processStepName: String(processStepName).trim(),
      processStepInfo: String(processStepInfo ?? '').trim(),
      process: String(process).trim(),
      machineId: machine._id,
      machineCode: machine.machineCode,
      machineName: machine.name,
      operatorId: operator._id,
      operatorCode: operator.employeeCode,
      operatorName: operator.name,
      plannedQuantity: qty,
      status: initialStatus,
      notes: String(notes ?? '').trim(),
      createdBy: (req as any).user?._id,
    })

    res.status(201).json({
      success: true,
      message: `Production Plan ${planNo} created successfully.`,
      plan: serializePlan(plan),
    })
  } catch (error) {
    next(error)
  }
}

/**
 * PUT /api/planning/:id
 * Update an existing Production Plan
 */
export async function updatePlan(req: Request<{ id: string }>, res: Response, next: NextFunction) {
  try {
    const plan = await ProductionPlan.findById(req.params.id)
    if (!plan) {
      res.status(404).json({ success: false, message: 'Production plan not found.' })
      return
    }

    const {
      batchId,
      productId,
      planDate,
      startDate,
      endDate,
      shift,
      processStepId,
      processStepName,
      processStepInfo,
      process,
      machineId,
      operatorId,
      plannedQuantity,
      status,
      actualQuantity,
      rejectedQuantity,
      reworkQuantity,
      notes,
    } = req.body

    if (batchId && looksLikeObjectId(batchId) && batchId !== plan.batchId.toString()) {
      const batch = await DeliveryBatch.findById(batchId)
      if (!batch) {
        res.status(404).json({ success: false, message: 'Selected Prod Batch not found.' })
        return
      }
      plan.batchId = batch._id
      plan.batchNo = batch.batchNo
      plan.orderId = batch.orderId
      plan.orderNo = batch.orderNo ?? ''
    }

    if (productId && looksLikeObjectId(productId) && productId !== plan.productId.toString()) {
      const product = await Product.findById(productId)
      if (!product) {
        res.status(404).json({ success: false, message: 'Selected Product not found.' })
        return
      }
      plan.productId = product._id
      plan.productCode = product.productCode
      plan.productName = product.name
    }

    if (startDate) {
      const d = new Date(startDate)
      if (!Number.isNaN(d.getTime())) {
        plan.startDate = d
        plan.planDate = d
      }
    }

    if (endDate) {
      const d = new Date(endDate)
      if (!Number.isNaN(d.getTime())) {
        plan.endDate = d
      }
    }

    if (planDate && !startDate) {
      const d = new Date(planDate)
      if (!Number.isNaN(d.getTime())) {
        plan.planDate = d
        if (!plan.startDate) plan.startDate = d
        if (!plan.endDate) plan.endDate = d
      }
    }

    if (shift) {
      plan.shift = String(shift).trim()
    }

    if (processStepName) {
      plan.processStepName = String(processStepName).trim()
    }

    if (processStepInfo !== undefined) {
      plan.processStepInfo = String(processStepInfo).trim()
    }

    if (processStepId !== undefined) {
      plan.processStepId = looksLikeObjectId(processStepId) ? processStepId : undefined
    }

    if (process) {
      plan.process = String(process).trim()
    }

    if (machineId && looksLikeObjectId(machineId) && machineId !== plan.machineId.toString()) {
      const machine = await Machine.findById(machineId)
      if (!machine) {
        res.status(404).json({ success: false, message: 'Selected Machine not found.' })
        return
      }
      plan.machineId = machine._id
      plan.machineCode = machine.machineCode
      plan.machineName = machine.name
    }

    if (operatorId && looksLikeObjectId(operatorId) && operatorId !== plan.operatorId.toString()) {
      const operator = await User.findById(operatorId)
      if (!operator) {
        res.status(404).json({ success: false, message: 'Selected Operator not found.' })
        return
      }
      plan.operatorId = operator._id
      plan.operatorCode = operator.employeeCode
      plan.operatorName = operator.name
    }

    if (plannedQuantity !== undefined) {
      const qty = Number(plannedQuantity)
      if (qty > 0 && Number.isInteger(qty)) {
        plan.plannedQuantity = qty
      }
    }

    if (status && PLAN_STATUSES.includes(status.toUpperCase())) {
      plan.status = status.toUpperCase() as PlanStatus
      if (plan.status === 'IN_PROGRESS' && !plan.startedAt) {
        plan.startedAt = new Date()
      } else if (plan.status === 'COMPLETED' && !plan.completedAt) {
        plan.completedAt = new Date()
      }
    }

    if (actualQuantity !== undefined && Number(actualQuantity) >= 0) {
      plan.actualQuantity = Number(actualQuantity)
    }

    if (rejectedQuantity !== undefined && Number(rejectedQuantity) >= 0) {
      plan.rejectedQuantity = Number(rejectedQuantity)
    }

    if (reworkQuantity !== undefined && Number(reworkQuantity) >= 0) {
      plan.reworkQuantity = Number(reworkQuantity)
    }

    if (notes !== undefined) {
      plan.notes = String(notes).trim()
    }

    await plan.save()

    res.json({
      success: true,
      message: `Production Plan ${plan.planNo} updated successfully.`,
      plan: serializePlan(plan),
    })
  } catch (error) {
    next(error)
  }
}

/**
 * DELETE /api/planning/:id
 * Delete a Production Plan
 */
export async function deletePlan(req: Request<{ id: string }>, res: Response, next: NextFunction) {
  try {
    const plan = await ProductionPlan.findById(req.params.id)
    if (!plan) {
      res.status(404).json({ success: false, message: 'Production plan not found.' })
      return
    }

    const planNo = plan.planNo
    await plan.deleteOne()

    res.json({
      success: true,
      message: `Production Plan ${planNo} deleted successfully.`,
    })
  } catch (error) {
    next(error)
  }
}
