import mongoose, { Schema } from 'mongoose'
import { MASTER_STATUSES, type MasterStatus } from '../constants/enums'

export interface IMachineType {
  name: string
  status: MasterStatus
}

const machineTypeSchema = new Schema<IMachineType>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
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

export const MachineType = mongoose.model<IMachineType>(
  'MachineType',
  machineTypeSchema,
)
