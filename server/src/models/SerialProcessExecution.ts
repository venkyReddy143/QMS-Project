import mongoose, { Schema, type Types } from 'mongoose'
import {
  SERIAL_EXECUTION_STATUSES,
  type SerialExecutionStatus,
} from '../constants/enums'

export interface ISerialProcessExecution {
  serialId: Types.ObjectId
  orderId: Types.ObjectId
  batchId: Types.ObjectId
  processStepId: Types.ObjectId
  machineId?: Types.ObjectId
  shiftId?: Types.ObjectId
  operatorId?: Types.ObjectId
  plannedHours: number
  actualHours?: number
  varianceHours?: number
  varianceFlag: boolean
  status: SerialExecutionStatus
  startedAt?: Date
  completedAt?: Date
  notes?: string
}

const serialProcessExecutionSchema = new Schema<ISerialProcessExecution>(
  {
    serialId: {
      type: Schema.Types.ObjectId,
      ref: 'ProductionSerial',
      required: true,
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
    processStepId: {
      type: Schema.Types.ObjectId,
      ref: 'ProcessStep',
      required: true,
    },
    machineId: {
      type: Schema.Types.ObjectId,
      ref: 'Machine',
    },
    shiftId: {
      type: Schema.Types.ObjectId,
      ref: 'Shift',
    },
    operatorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    plannedHours: {
      type: Number,
      required: true,
      min: 0,
    },
    actualHours: {
      type: Number,
      min: 0,
    },
    varianceHours: {
      type: Number,
    },
    varianceFlag: {
      type: Boolean,
      required: true,
      default: false,
    },
    status: {
      type: String,
      enum: SERIAL_EXECUTION_STATUSES,
      required: true,
      default: 'NOT_STARTED',
    },
    startedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { timestamps: true },
)

serialProcessExecutionSchema.index(
  { serialId: 1, processStepId: 1 },
  { unique: true },
)
serialProcessExecutionSchema.index({ machineId: 1, shiftId: 1, status: 1 })
serialProcessExecutionSchema.index({ orderId: 1, processStepId: 1 })

export const SerialProcessExecution =
  mongoose.model<ISerialProcessExecution>(
    'SerialProcessExecution',
    serialProcessExecutionSchema,
  )
