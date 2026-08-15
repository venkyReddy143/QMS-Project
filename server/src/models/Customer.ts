import mongoose, { Schema } from 'mongoose'
import { MASTER_STATUSES, type MasterStatus } from '../constants/enums'

export interface ICustomer {
  name: string
  status: MasterStatus
}

const customerSchema = new Schema<ICustomer>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
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

export const Customer = mongoose.model<ICustomer>('Customer', customerSchema)
