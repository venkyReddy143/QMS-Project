import mongoose, { Schema, type Types } from 'mongoose'
import { DISPATCH_STATUSES, type DispatchStatus } from '../constants/enums'

export interface IDispatch {
  dispatchNo: string
  orderId: Types.ObjectId
  batchId: Types.ObjectId
  dispatchQuantity: number
  dispatchDate: Date
  qaReleaseStatus: string
  invoiceId?: Types.ObjectId
  vehicleId?: Types.ObjectId
  location?: string
  status: DispatchStatus
  createdBy: Types.ObjectId
}

const dispatchSchema = new Schema<IDispatch>(
  {
    dispatchNo: {
      type: String,
      required: true,
      unique: true,
      trim: true,
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
    dispatchQuantity: {
      type: Number,
      required: true,
      min: 0,
    },
    dispatchDate: {
      type: Date,
      required: true,
    },
    qaReleaseStatus: {
      type: String,
      required: true,
      trim: true,
      default: 'RELEASED',
    },
    invoiceId: {
      type: Schema.Types.ObjectId,
      ref: 'Invoice',
    },
    vehicleId: {
      type: Schema.Types.ObjectId,
      ref: 'Vehicle',
    },
    location: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: DISPATCH_STATUSES,
      required: true,
      default: 'READY',
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true },
)

dispatchSchema.index({ dispatchNo: 1 }, { unique: true })
dispatchSchema.index({ orderId: 1, dispatchDate: -1 })
dispatchSchema.index({ batchId: 1, status: 1 })

export const Dispatch = mongoose.model<IDispatch>('Dispatch', dispatchSchema)
