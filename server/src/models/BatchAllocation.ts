import mongoose, { Schema, type Types } from 'mongoose'

export interface IBatchAllocation {
  orderId: Types.ObjectId
  batchId: Types.ObjectId
  allocatedQuantity: number
  allocationVersion: number
  isCurrent: boolean
  createdBy: Types.ObjectId
}

const batchAllocationSchema = new Schema<IBatchAllocation>(
  {
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
    allocatedQuantity: {
      type: Number,
      required: true,
      min: 0,
    },
    allocationVersion: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    isCurrent: {
      type: Boolean,
      required: true,
      default: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

batchAllocationSchema.index({ orderId: 1, allocationVersion: 1 })
batchAllocationSchema.index({ orderId: 1, isCurrent: 1 })

export const BatchAllocation = mongoose.model<IBatchAllocation>(
  'BatchAllocation',
  batchAllocationSchema,
)
