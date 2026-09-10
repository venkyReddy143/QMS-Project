import mongoose, { Schema, type Types } from 'mongoose'
import { CAPACITY_STATUSES, type CapacityStatus } from '../constants/enums'

export interface IMachineCapacityAllocation {
  planningDate: Date
  shiftId: Types.ObjectId
  machineId: Types.ObjectId
  orderId: Types.ObjectId
  batchId?: Types.ObjectId
  processStepId: Types.ObjectId
  plannedQuantity: number
  standardHoursPerPiece: number
  plannedHours: number
  effectiveCapacityHours: number
  utilizationPercent: number
  capacityStatus: CapacityStatus
  createdBy: Types.ObjectId
}

const machineCapacityAllocationSchema =
  new Schema<IMachineCapacityAllocation>(
    {
      planningDate: {
        type: Date,
        required: true,
      },
      shiftId: {
        type: Schema.Types.ObjectId,
        ref: 'Shift',
        required: true,
      },
      machineId: {
        type: Schema.Types.ObjectId,
        ref: 'Machine',
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
      },
      processStepId: {
        type: Schema.Types.ObjectId,
        ref: 'ProcessStep',
        required: true,
      },
      plannedQuantity: {
        type: Number,
        required: true,
        min: 0,
      },
      standardHoursPerPiece: {
        type: Number,
        required: true,
        min: 0,
      },
      plannedHours: {
        type: Number,
        required: true,
        min: 0,
      },
      effectiveCapacityHours: {
        type: Number,
        required: true,
        min: 0,
      },
      utilizationPercent: {
        type: Number,
        required: true,
        min: 0,
      },
      capacityStatus: {
        type: String,
        enum: CAPACITY_STATUSES,
        required: true,
        default: 'HEALTHY',
      },
      createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    },
    { timestamps: true },
  )

machineCapacityAllocationSchema.index({
  planningDate: 1,
  shiftId: 1,
  machineId: 1,
  processStepId: 1,
})
machineCapacityAllocationSchema.index({ orderId: 1, planningDate: 1 })
machineCapacityAllocationSchema.index({
  machineId: 1,
  planningDate: 1,
  shiftId: 1,
})

export const MachineCapacityAllocation =
  mongoose.model<IMachineCapacityAllocation>(
    'MachineCapacityAllocation',
    machineCapacityAllocationSchema,
  )
