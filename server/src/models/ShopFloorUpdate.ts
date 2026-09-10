import mongoose, { Schema, type Types } from 'mongoose'
import {
  SERIAL_EXECUTION_STATUSES,
  type SerialExecutionStatus,
} from '../constants/enums'

export interface IShopFloorUpdate {
  serialId: Types.ObjectId
  processExecutionId: Types.ObjectId
  previousStatus?: SerialExecutionStatus
  newStatus: SerialExecutionStatus
  actualHours?: number
  operatorId: Types.ObjectId
  shiftId?: Types.ObjectId
  remarks?: string
}

const shopFloorUpdateSchema = new Schema<IShopFloorUpdate>(
  {
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
    previousStatus: {
      type: String,
      enum: SERIAL_EXECUTION_STATUSES,
    },
    newStatus: {
      type: String,
      enum: SERIAL_EXECUTION_STATUSES,
      required: true,
    },
    actualHours: {
      type: Number,
      min: 0,
    },
    operatorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    shiftId: {
      type: Schema.Types.ObjectId,
      ref: 'Shift',
    },
    remarks: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

shopFloorUpdateSchema.index({ serialId: 1, createdAt: -1 })
shopFloorUpdateSchema.index({ shiftId: 1, createdAt: -1 })

export const ShopFloorUpdate = mongoose.model<IShopFloorUpdate>(
  'ShopFloorUpdate',
  shopFloorUpdateSchema,
)
