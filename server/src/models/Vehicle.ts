import mongoose, { Schema } from 'mongoose'
import { VEHICLE_STATUSES, type VehicleStatus } from '../constants/enums'

export interface IVehicle {
  vehicleNo: string
  carrierName: string
  driverName?: string
  driverContact?: string
  trackingReference?: string
  status: VehicleStatus
}

const vehicleSchema = new Schema<IVehicle>(
  {
    vehicleNo: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    carrierName: {
      type: String,
      required: true,
      trim: true,
    },
    driverName: {
      type: String,
      trim: true,
      default: '',
    },
    driverContact: {
      type: String,
      trim: true,
      default: '',
    },
    trackingReference: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: VEHICLE_STATUSES,
      required: true,
      default: 'ASSIGNED',
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

vehicleSchema.index({ vehicleNo: 1 })

export const Vehicle = mongoose.model<IVehicle>('Vehicle', vehicleSchema)
