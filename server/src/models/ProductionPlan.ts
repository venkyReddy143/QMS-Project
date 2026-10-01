import mongoose, { Schema, type Types } from 'mongoose'

export const PLAN_STATUSES = [
  'PLANNED',
  'IN_PROGRESS',
  'COMPLETED',
  'ON_HOLD',
  'CANCELLED',
] as const
export type PlanStatus = (typeof PLAN_STATUSES)[number]

export interface IProductionPlan {
  planNo: string
  batchId: Types.ObjectId
  batchNo: string
  orderId?: Types.ObjectId
  orderNo?: string
  productId: Types.ObjectId
  productCode: string
  productName: string
  planDate: Date
  startDate?: Date
  endDate?: Date
  shift: string
  processStepId?: Types.ObjectId
  processStepName: string
  processStepInfo: string
  process: string
  machineId: Types.ObjectId
  machineCode: string
  machineName: string
  operatorId: Types.ObjectId
  operatorCode?: string
  operatorName: string
  plannedQuantity: number
  // Fields for future Production Execution Module
  status: PlanStatus
  actualQuantity: number
  rejectedQuantity: number
  reworkQuantity: number
  notes?: string
  startedAt?: Date
  completedAt?: Date
  createdBy?: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const productionPlanSchema = new Schema<IProductionPlan>(
  {
    planNo: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    batchId: {
      type: Schema.Types.ObjectId,
      ref: 'DeliveryBatch',
      required: true,
      index: true,
    },
    batchNo: {
      type: String,
      required: true,
      trim: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'ProductionOrder',
    },
    orderNo: {
      type: String,
      trim: true,
      default: '',
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    productCode: {
      type: String,
      required: true,
      trim: true,
    },
    productName: {
      type: String,
      required: true,
      trim: true,
    },
    planDate: {
      type: Date,
      required: true,
      index: true,
    },
    startDate: {
      type: Date,
      index: true,
    },
    endDate: {
      type: Date,
      index: true,
    },
    shift: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    processStepId: {
      type: Schema.Types.ObjectId,
      ref: 'ProcessStep',
    },
    processStepName: {
      type: String,
      required: true,
      trim: true,
    },
    processStepInfo: {
      type: String,
      trim: true,
      default: '',
    },
    process: {
      type: String,
      required: true,
      trim: true,
    },
    machineId: {
      type: Schema.Types.ObjectId,
      ref: 'Machine',
      required: true,
      index: true,
    },
    machineCode: {
      type: String,
      required: true,
      trim: true,
    },
    machineName: {
      type: String,
      required: true,
      trim: true,
    },
    operatorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    operatorCode: {
      type: String,
      trim: true,
      default: '',
    },
    operatorName: {
      type: String,
      required: true,
      trim: true,
    },
    plannedQuantity: {
      type: Number,
      required: true,
      min: 1,
    },
    // Production Execution readiness
    status: {
      type: String,
      enum: PLAN_STATUSES,
      required: true,
      default: 'PLANNED',
      index: true,
    },
    actualQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    rejectedQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    reworkQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    startedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true },
)

productionPlanSchema.index({ planDate: 1, shift: 1, machineId: 1 })
productionPlanSchema.index({ planDate: 1, shift: 1, operatorId: 1 })

export const ProductionPlan = mongoose.model<IProductionPlan>(
  'ProductionPlan',
  productionPlanSchema,
)
