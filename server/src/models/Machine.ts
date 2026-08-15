import mongoose, { Schema } from 'mongoose'
import {
  MACHINE_HEALTH_STATUSES,
  MACHINE_STATUSES,
  type MachineHealthStatus,
  type MachineStatus,
} from '../constants/enums'

export interface IMachine {
  machineCode: string
  name: string
  machineType: string
  bay?: string
  maxHoursPerShift: number
  status: MachineStatus
  maintenanceStatus?: MachineHealthStatus
  active: boolean
}

const machineSchema = new Schema<IMachine>(
  {
    machineCode: {
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
    machineType: {
      type: String,
      required: true,
      trim: true,
    },
    bay: {
      type: String,
      trim: true,
    },
    maxHoursPerShift: {
      type: Number,
      required: true,
      min: 0,
      default: 7.5,
    },
    status: {
      type: String,
      enum: MACHINE_STATUSES,
      required: true,
      default: 'AVAILABLE',
    },
    maintenanceStatus: {
      type: String,
      enum: MACHINE_HEALTH_STATUSES,
      default: 'HEALTHY',
    },
    active: {
      type: Boolean,
      required: true,
      default: true,
    },
  },
  { timestamps: true },
)

machineSchema.index({ machineCode: 1 }, { unique: true })
machineSchema.index({ machineType: 1, status: 1 })

export const Machine = mongoose.model<IMachine>('Machine', machineSchema)
