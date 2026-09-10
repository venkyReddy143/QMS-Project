import mongoose, { Schema, type Types } from 'mongoose'
import { AUDIT_ACTIONS, type AuditAction } from '../constants/enums'

export interface IAuditLog {
  entityType: string
  entityId: Types.ObjectId
  action: AuditAction
  previousValue?: Record<string, unknown>
  newValue?: Record<string, unknown>
  performedBy: Types.ObjectId
  requestId?: string
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    entityType: {
      type: String,
      required: true,
      trim: true,
    },
    entityId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    action: {
      type: String,
      enum: AUDIT_ACTIONS,
      required: true,
    },
    previousValue: {
      type: Schema.Types.Mixed,
    },
    newValue: {
      type: Schema.Types.Mixed,
    },
    performedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    requestId: {
      type: String,
      trim: true,
    },
  },
  { timestamps: { createdAt: 'performedAt', updatedAt: false } },
)

auditLogSchema.index({ entityType: 1, entityId: 1, performedAt: -1 })
auditLogSchema.index({ requestId: 1 })

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', auditLogSchema)
