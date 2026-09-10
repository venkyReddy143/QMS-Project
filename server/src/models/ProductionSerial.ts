import mongoose, { Schema, type Types } from 'mongoose'
import {
  PRODUCTION_SERIAL_STATUSES,
  QUALITY_STATUSES,
  type ProductionSerialStatus,
  type QualityStatus,
} from '../constants/enums'

export interface IProductionSerial {
  serialNo: string
  orderId: Types.ObjectId
  batchId: Types.ObjectId
  productId: Types.ObjectId
  currentStepId?: Types.ObjectId
  currentStepSequence?: number
  currentMachineId?: Types.ObjectId
  status: ProductionSerialStatus
  completionPercent: number
  qualityStatus: QualityStatus
}

const productionSerialSchema = new Schema<IProductionSerial>(
  {
    serialNo: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'ProductionOrder',
      required: true,
    },
    batchId: {
      type: Schema.Types.ObjectId,
      ref: 'DeliveryBatch',
      required: true,
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    currentStepId: {
      type: Schema.Types.ObjectId,
      ref: 'ProcessStep',
    },
    currentStepSequence: {
      type: Number,
      min: 1,
    },
    currentMachineId: {
      type: Schema.Types.ObjectId,
      ref: 'Machine',
    },
    status: {
      type: String,
      enum: PRODUCTION_SERIAL_STATUSES,
      required: true,
      default: 'NOT_STARTED',
    },
    completionPercent: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 0,
    },
    qualityStatus: {
      type: String,
      enum: QUALITY_STATUSES,
      required: true,
      default: 'PENDING',
    },
  },
  { timestamps: true },
)

productionSerialSchema.index({ serialNo: 1 }, { unique: true })
productionSerialSchema.index({ orderId: 1, batchId: 1, status: 1 })
productionSerialSchema.index({ currentMachineId: 1, status: 1 })

export const ProductionSerial = mongoose.model<IProductionSerial>(
  'ProductionSerial',
  productionSerialSchema,
)
