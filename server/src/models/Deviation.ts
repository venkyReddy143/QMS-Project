import mongoose, { Schema, type Types } from 'mongoose'
import { DEVIATION_STATUSES, type DeviationStatus } from '../constants/enums'

export interface IDeviation {
  deviationNo: string
  serialId?: Types.ObjectId
  processExecutionId?: Types.ObjectId
  orderId?: Types.ObjectId
  type: string
  standardHours: number
  actualHours: number
  deltaHours: number
  variancePercent: number
  managerComment?: string
  status: DeviationStatus
  approvedBy?: Types.ObjectId
  approvedAt?: Date
}

const deviationSchema = new Schema<IDeviation>(
  {
    deviationNo: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    serialId: {
      type: Schema.Types.ObjectId,
      ref: 'ProductionSerial',
    },
    processExecutionId: {
      type: Schema.Types.ObjectId,
      ref: 'SerialProcessExecution',
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'ProductionOrder',
    },
    type: {
      type: String,
      required: true,
      trim: true,
    },
    standardHours: {
      type: Number,
      required: true,
      min: 0,
    },
    actualHours: {
      type: Number,
      required: true,
      min: 0,
    },
    deltaHours: {
      type: Number,
      required: true,
    },
    variancePercent: {
      type: Number,
      required: true,
    },
    managerComment: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: DEVIATION_STATUSES,
      required: true,
      default: 'PENDING_APPROVAL',
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: {
      type: Date,
    },
  },
  { timestamps: true },
)

deviationSchema.index({ deviationNo: 1 }, { unique: true })
deviationSchema.index({ status: 1, createdAt: -1 })

export const Deviation = mongoose.model<IDeviation>('Deviation', deviationSchema)
