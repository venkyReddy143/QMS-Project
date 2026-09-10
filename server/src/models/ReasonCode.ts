import mongoose, { Schema } from 'mongoose'

export interface IReasonCode {
  code: string
  category: string
  name: string
  requiresComment: boolean
  active: boolean
}

const reasonCodeSchema = new Schema<IReasonCode>(
  {
    code: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    requiresComment: {
      type: Boolean,
      required: true,
      default: false,
    },
    active: {
      type: Boolean,
      required: true,
      default: true,
    },
  },
  { timestamps: true },
)

reasonCodeSchema.index({ category: 1, code: 1 }, { unique: true })

export const ReasonCode = mongoose.model<IReasonCode>(
  'ReasonCode',
  reasonCodeSchema,
)
