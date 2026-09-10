import mongoose, { Schema, type Types } from 'mongoose'
import { INVOICE_STATUSES, type InvoiceStatus } from '../constants/enums'

export interface IInvoice {
  invoiceNo: string
  orderId: Types.ObjectId
  invoiceDate: Date
  status: InvoiceStatus
  documentUrl?: string
}

const invoiceSchema = new Schema<IInvoice>(
  {
    invoiceNo: {
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
    invoiceDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: INVOICE_STATUSES,
      required: true,
      default: 'ACTIVE',
    },
    documentUrl: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

invoiceSchema.index({ invoiceNo: 1 }, { unique: true })

export const Invoice = mongoose.model<IInvoice>('Invoice', invoiceSchema)
