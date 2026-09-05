import mongoose, { Schema, type Types } from 'mongoose'
import {
  INVENTORY_SERIAL_STATUSES,
  type InventorySerialStatus,
} from '../constants/enums'

export interface IInventorySerial {
  productId: Types.ObjectId
  serialNumber: string
  status: InventorySerialStatus
  holderUserId?: Types.ObjectId
  holderName?: string
}

const inventorySerialSchema = new Schema<IInventorySerial>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    serialNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    status: {
      type: String,
      enum: INVENTORY_SERIAL_STATUSES,
      required: true,
      default: 'IN_STORE',
    },
    holderUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    holderName: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { timestamps: true },
)

inventorySerialSchema.index({ productId: 1, serialNumber: 1 }, { unique: true })
inventorySerialSchema.index({ productId: 1, status: 1 })

export const InventorySerial = mongoose.model<IInventorySerial>(
  'InventorySerial',
  inventorySerialSchema,
)
