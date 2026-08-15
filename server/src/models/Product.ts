import mongoose, { Schema } from 'mongoose'
import {
  MASTER_STATUSES,
  PRODUCT_TYPES,
  type MasterStatus,
  type ProductType,
} from '../constants/enums'

export interface IProduct {
  productCode: string
  name: string
  description?: string
  uom: string
  revision?: string
  productType: ProductType
  unitRate: number
  status: MasterStatus
}

const productSchema = new Schema<IProduct>(
  {
    productCode: {
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
    description: {
      type: String,
      trim: true,
    },
    uom: {
      type: String,
      required: true,
      default: 'PCS',
      uppercase: true,
      trim: true,
    },
    revision: {
      type: String,
      trim: true,
    },
    productType: {
      type: String,
      enum: PRODUCT_TYPES,
      required: true,
      default: 'PRODUCT',
    },
    unitRate: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    status: {
      type: String,
      enum: MASTER_STATUSES,
      required: true,
      default: 'ACTIVE',
    },
  },
  { timestamps: true },
)

export const Product = mongoose.model<IProduct>('Product', productSchema)
