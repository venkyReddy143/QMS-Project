import mongoose, { Schema, type Types } from 'mongoose'

export interface INotification {
  type: string
  severity: string
  entityType?: string
  entityId?: Types.ObjectId
  message: string
  recipientUserId: Types.ObjectId
  readAt?: Date
}

const notificationSchema = new Schema<INotification>(
  {
    type: {
      type: String,
      required: true,
      trim: true,
    },
    severity: {
      type: String,
      required: true,
      trim: true,
    },
    entityType: {
      type: String,
      trim: true,
    },
    entityId: {
      type: Schema.Types.ObjectId,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    recipientUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

notificationSchema.index({ recipientUserId: 1, readAt: 1, createdAt: -1 })

export const Notification = mongoose.model<INotification>(
  'Notification',
  notificationSchema,
)
