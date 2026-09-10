import mongoose, { Schema, type Types } from 'mongoose'

export interface IDispatchLine {
  dispatchId: Types.ObjectId
  serialId?: Types.ObjectId
  productId: Types.ObjectId
  quantity: number
  uom: string
}

const dispatchLineSchema = new Schema<IDispatchLine>(
  {
    dispatchId: {
      type: Schema.Types.ObjectId,
      ref: 'Dispatch',
      required: true,
    },
    serialId: {
      type: Schema.Types.ObjectId,
      ref: 'ProductionSerial',
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    uom: {
      type: String,
      required: true,
      default: 'PCS',
      uppercase: true,
      trim: true,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

dispatchLineSchema.index({ dispatchId: 1, serialId: 1 })

export const DispatchLine = mongoose.model<IDispatchLine>(
  'DispatchLine',
  dispatchLineSchema,
)
