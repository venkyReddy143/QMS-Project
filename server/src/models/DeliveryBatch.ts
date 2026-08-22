import mongoose, { Schema, type Types } from 'mongoose'
import {
  BATCH_STATUSES,
  ORDER_PRIORITIES,
  SERIAL_STATUSES,
  type BatchStatus,
  type OrderPriority,
  type SerialStatus,
} from '../constants/enums'

export interface IBatchSerial {
  serialNumber: string
  sequence: number
  status: SerialStatus
}

export interface IBatchAssignment {
  employeeId: Types.ObjectId
  employeeName: string
  shift: string
  assignedAt: Date
}

export interface IBatchTimeLog {
  employeeId: Types.ObjectId
  employeeName: string
  shift: string
  hours: number
  note?: string
  loggedAt: Date
}

export interface IDeliveryBatch {
  orderId: Types.ObjectId
  orderNo: string
  productId?: Types.ObjectId
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
  assignments: IBatchAssignment[]
  timeLogs: IBatchTimeLog[]
  serials: IBatchSerial[]
  createdBy: Types.ObjectId
}

const deliveryBatchSchema = new Schema<IDeliveryBatch>(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'ProductionOrder',
      required: true,
    },
    orderNo: {
      type: String,
      trim: true,
      default: '',
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
    },
    productName: {
      type: String,
      trim: true,
      default: '',
    },
    processStepName: {
      type: String,
      trim: true,
      default: '',
    },
    batchNo: {
      type: String,
      required: true,
      trim: true,
    },
    plannedQuantity: {
      type: Number,
      required: true,
      min: 1,
    },
    bufferQty: {
      type: Number,
      min: 0,
      default: 0,
    },
    totalBatchQty: {
      type: Number,
      required: true,
      min: 1,
    },
    targetDispatchDate: {
      type: Date,
      required: true,
    },
    priority: {
      type: String,
      enum: ORDER_PRIORITIES,
      required: true,
      default: 'NORMAL',
    },
    status: {
      type: String,
      enum: BATCH_STATUSES,
      required: true,
      default: 'SCHEDULED',
    },
    completedQuantity: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    dispatchedQuantity: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    progressPercent: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 0,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    assignments: {
      type: [
        {
          employeeId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
          employeeName: { type: String, required: true, trim: true },
          shift: { type: String, required: true, trim: true },
          assignedAt: { type: Date, required: true, default: Date.now },
        },
      ],
      default: [],
    },
    timeLogs: {
      type: [
        {
          employeeId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
          employeeName: { type: String, required: true, trim: true },
          shift: { type: String, required: true, trim: true },
          hours: { type: Number, required: true, min: 0 },
          note: { type: String, trim: true, default: '' },
          loggedAt: { type: Date, required: true, default: Date.now },
        },
      ],
      default: [],
    },
    serials: {
      type: [
        {
          serialNumber: { type: String, required: true, trim: true },
          sequence: { type: Number, required: true, min: 1 },
          status: {
            type: String,
            enum: SERIAL_STATUSES,
            required: true,
            default: 'QUEUED',
          },
        },
      ],
      default: [],
    },
  },
  { timestamps: true },
)

deliveryBatchSchema.index({ orderId: 1, batchNo: 1 }, { unique: true })
deliveryBatchSchema.index({ orderId: 1, targetDispatchDate: 1 })
deliveryBatchSchema.index({ 'serials.serialNumber': 1 }, { unique: true, sparse: true })

export const DeliveryBatch = mongoose.model<IDeliveryBatch>(
  'DeliveryBatch',
  deliveryBatchSchema,
)
