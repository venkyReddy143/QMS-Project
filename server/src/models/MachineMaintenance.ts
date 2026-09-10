import mongoose, { Schema, type Types } from 'mongoose'
import {
  MAINTENANCE_STATUSES,
  MAINTENANCE_TYPES,
  type MaintenanceStatus,
  type MaintenanceType,
} from '../constants/enums'

export interface IMachineMaintenance {
  machineId: Types.ObjectId
  maintenanceType: MaintenanceType
  startAt: Date
  endAt?: Date
  status: MaintenanceStatus
  reason?: string
  createdBy: Types.ObjectId
}

const machineMaintenanceSchema = new Schema<IMachineMaintenance>(
  {
    machineId: {
      type: Schema.Types.ObjectId,
      ref: 'Machine',
      required: true,
    },
    maintenanceType: {
      type: String,
      enum: MAINTENANCE_TYPES,
      required: true,
      default: 'PREVENTIVE',
    },
    startAt: {
      type: Date,
      required: true,
    },
    endAt: {
      type: Date,
    },
    status: {
      type: String,
      enum: MAINTENANCE_STATUSES,
      required: true,
      default: 'SCHEDULED',
    },
    reason: {
      type: String,
      trim: true,
      default: '',
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

machineMaintenanceSchema.index({ machineId: 1, startAt: 1 })

export const MachineMaintenance = mongoose.model<IMachineMaintenance>(
  'MachineMaintenance',
  machineMaintenanceSchema,
)
