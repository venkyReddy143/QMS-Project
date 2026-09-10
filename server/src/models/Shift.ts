import mongoose, { Schema } from 'mongoose'
import { MASTER_STATUSES, type MasterStatus } from '../constants/enums'

export interface IShift {
  shiftCode: string
  name: string
  startTime: string
  endTime: string
  timezone: string
  status: MasterStatus
  effectiveFrom: Date
}

const shiftSchema = new Schema<IShift>(
  {
    shiftCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    startTime: {
      type: String,
      required: true,
      trim: true,
    },
    endTime: {
      type: String,
      required: true,
      trim: true,
    },
    timezone: {
      type: String,
      required: true,
      trim: true,
      default: 'Asia/Kolkata',
    },
    status: {
      type: String,
      enum: MASTER_STATUSES,
      required: true,
      default: 'ACTIVE',
    },
    effectiveFrom: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  { timestamps: true },
)

shiftSchema.index({ shiftCode: 1 }, { unique: true })

export const Shift = mongoose.model<IShift>('Shift', shiftSchema)
