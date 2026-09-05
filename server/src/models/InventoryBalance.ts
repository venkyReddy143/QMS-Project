import mongoose, { Schema, type Types } from 'mongoose'

export interface IInventoryBalance {
  productId: Types.ObjectId
  quantity: number
}

const inventoryBalanceSchema = new Schema<IInventoryBalance>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      unique: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
  },
  { timestamps: true },
)

export const InventoryBalance = mongoose.model<IInventoryBalance>(
  'InventoryBalance',
  inventoryBalanceSchema,
)
