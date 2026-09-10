import mongoose, { Schema, type Types } from 'mongoose'
import {
  DISPATCH_DOCUMENT_TYPES,
  type DispatchDocumentType,
} from '../constants/enums'

export interface IDispatchDocument {
  dispatchId: Types.ObjectId
  invoiceId?: Types.ObjectId
  documentType: DispatchDocumentType
  fileName: string
  storageKey: string
  uploadedBy: Types.ObjectId
}

const dispatchDocumentSchema = new Schema<IDispatchDocument>(
  {
    dispatchId: {
      type: Schema.Types.ObjectId,
      ref: 'Dispatch',
      required: true,
    },
    invoiceId: {
      type: Schema.Types.ObjectId,
      ref: 'Invoice',
    },
    documentType: {
      type: String,
      enum: DISPATCH_DOCUMENT_TYPES,
      required: true,
    },
    fileName: {
      type: String,
      required: true,
      trim: true,
    },
    storageKey: {
      type: String,
      required: true,
      trim: true,
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

dispatchDocumentSchema.index({ dispatchId: 1, documentType: 1 })

export const DispatchDocument = mongoose.model<IDispatchDocument>(
  'DispatchDocument',
  dispatchDocumentSchema,
)
