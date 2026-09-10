import mongoose, { Schema, type Types } from 'mongoose'
import {
  SERIAL_EXECUTION_STATUSES,
  type SerialExecutionStatus,
} from '../constants/enums'

export interface IHandoverSerialTransfer {
  handoverId: Types.ObjectId
  serialId: Types.ObjectId
  processExecutionId: Types.ObjectId
  completionPercent: number
  fromStatus: SerialExecutionStatus
  notes?: string
  acknowledged: boolean
}

const handoverSerialTransferSchema = new Schema<IHandoverSerialTransfer>(
  {
    handoverId: {
      type: Schema.Types.ObjectId,
      ref: 'ShiftHandover',
      required: true,
    },
    serialId: {
      type: Schema.Types.ObjectId,
      ref: 'ProductionSerial',
      required: true,
    },
    processExecutionId: {
      type: Schema.Types.ObjectId,
      ref: 'SerialProcessExecution',
      required: true,
    },
    completionPercent: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 0,
    },
    fromStatus: {
      type: String,
      enum: SERIAL_EXECUTION_STATUSES,
      required: true,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    acknowledged: {
      type: Boolean,
      required: true,
      default: false,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

handoverSerialTransferSchema.index(
  { handoverId: 1, serialId: 1 },
  { unique: true },
)

export const HandoverSerialTransfer =
  mongoose.model<IHandoverSerialTransfer>(
    'HandoverSerialTransfer',
    handoverSerialTransferSchema,
  )
