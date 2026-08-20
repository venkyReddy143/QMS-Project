import mongoose, { Schema, type Types } from 'mongoose'
import {
  BATCH_STATUSES,
  ORDER_PRIORITIES,
  type BatchStatus,
  type OrderPriority,
} from '../constants/enums'

export interface IDeliveryBatch {
  orderId: Types.ObjectId
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
  createdBy: Types.ObjectId
}

const deliveryBatchSchema = new Schema<IDeliveryBatch>(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'ProductionOrder',
      required: true,
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
  },
  { timestamps: true },
)

deliveryBatchSchema.index({ orderId: 1, batchNo: 1 }, { unique: true })
deliveryBatchSchema.index({ orderId: 1, targetDispatchDate: 1 })

export const DeliveryBatch = mongoose.model<IDeliveryBatch>(
  'DeliveryBatch',
  deliveryBatchSchema,
)
