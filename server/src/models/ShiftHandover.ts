import mongoose, { Schema, type Types } from 'mongoose'
import { HANDOVER_STATUSES, type HandoverStatus } from '../constants/enums'

export interface IShiftHandover {
  handoverNo: string
  planningDate: Date
  machineId?: Types.ObjectId
  outgoingShiftId: Types.ObjectId
  incomingShiftId: Types.ObjectId
  outgoingUserId: Types.ObjectId
  incomingUserId: Types.ObjectId
  notes?: string
  status: HandoverStatus
  acknowledgedAt?: Date
}

const shiftHandoverSchema = new Schema<IShiftHandover>(
  {
    handoverNo: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    planningDate: {
      type: Date,
      required: true,
    },
    machineId: {
      type: Schema.Types.ObjectId,
      ref: 'Machine',
    },
    outgoingShiftId: {
      type: Schema.Types.ObjectId,
      ref: 'Shift',
      required: true,
    },
    incomingShiftId: {
      type: Schema.Types.ObjectId,
      ref: 'Shift',
      required: true,
    },
    outgoingUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    incomingUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: HANDOVER_STATUSES,
      required: true,
      default: 'PENDING_ACKNOWLEDGMENT',
    },
    acknowledgedAt: {
      type: Date,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

shiftHandoverSchema.index({ handoverNo: 1 }, { unique: true })
shiftHandoverSchema.index({
  planningDate: 1,
  outgoingShiftId: 1,
  incomingShiftId: 1,
})

export const ShiftHandover = mongoose.model<IShiftHandover>(
  'ShiftHandover',
  shiftHandoverSchema,
)
