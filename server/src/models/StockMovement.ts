import mongoose, { Schema, type Types } from 'mongoose'
import {
  STOCK_ENTRY_TYPES,
  STOCK_TRANSFER_TYPES,
  type StockEntryType,
  type StockTransferType,
} from '../constants/enums'

export interface IStockMovement {
  entryType: StockEntryType
  productId: Types.ObjectId
  productCode: string
  productName: string
  isSerialControl: boolean
  serialNumber?: string
  quantity: number
  transferType: StockTransferType
  fromPersonId?: Types.ObjectId
  fromPersonName: string
  toPersonId?: Types.ObjectId
  toPersonName: string
  remarks: string
  createdBy: Types.ObjectId
}

const stockMovementSchema = new Schema<IStockMovement>(
  {
    entryType: {
      type: String,
      enum: STOCK_ENTRY_TYPES,
      required: true,
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    productCode: {
      type: String,
      required: true,
      trim: true,
    },
    productName: {
      type: String,
      required: true,
      trim: true,
    },
    isSerialControl: {
      type: Boolean,
      required: true,
    },
    serialNumber: {
      type: String,
      trim: true,
      uppercase: true,
      default: '',
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    transferType: {
      type: String,
      enum: STOCK_TRANSFER_TYPES,
      required: true,
    },
    fromPersonId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    fromPersonName: {
      type: String,
      trim: true,
      default: '',
    },
    toPersonId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    toPersonName: {
      type: String,
      trim: true,
      default: '',
    },
    remarks: {
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
  { timestamps: true },
)

stockMovementSchema.index({ productId: 1, createdAt: -1 })

export const StockMovement = mongoose.model<IStockMovement>(
  'StockMovement',
  stockMovementSchema,
)
