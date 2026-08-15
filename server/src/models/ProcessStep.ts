import mongoose, { Schema } from 'mongoose'
import { MASTER_STATUSES, type MasterStatus } from '../constants/enums'

export interface IProcessStep {
  code: string
  name: string
  category: string
  standardHoursPerPiece: number
  requiresQualityRelease: boolean
  status: MasterStatus
}

const processStepSchema = new Schema<IProcessStep>(
  {
    code: {
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
    category: {
      type: String,
      required: true,
      trim: true,
    },
    standardHoursPerPiece: {
      type: Number,
      required: true,
      min: 0,
    },
    requiresQualityRelease: {
      type: Boolean,
      required: true,
      default: false,
    },
    status: {
      type: String,
      enum: MASTER_STATUSES,
      required: true,
      default: 'ACTIVE',
    },
  },
  { timestamps: true },
)

export const ProcessStep = mongoose.model<IProcessStep>(
  'ProcessStep',
  processStepSchema,
)
