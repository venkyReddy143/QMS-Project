import mongoose, { Schema, type Types } from 'mongoose'

export interface IDashboardSnapshot {
  snapshotDate: Date
  shiftId?: Types.ObjectId
  orderId?: Types.ObjectId
  plannedQuantity: number
  completedQuantity: number
  overallProgressPercent: number
  plannedHours: number
  actualHours: number
  efficiencyPercent: number
  firstPassYieldPercent: number
  rejectionQuantity: number
  bottleneckStepId?: Types.ObjectId
  criticalDowntimeHours: number
  generatedAt: Date
}

const dashboardSnapshotSchema = new Schema<IDashboardSnapshot>(
  {
    snapshotDate: {
      type: Date,
      required: true,
    },
    shiftId: {
      type: Schema.Types.ObjectId,
      ref: 'Shift',
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'ProductionOrder',
    },
    plannedQuantity: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    completedQuantity: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    overallProgressPercent: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    plannedHours: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    actualHours: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    efficiencyPercent: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    firstPassYieldPercent: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    rejectionQuantity: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    bottleneckStepId: {
      type: Schema.Types.ObjectId,
      ref: 'ProcessStep',
    },
    criticalDowntimeHours: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    generatedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

dashboardSnapshotSchema.index({ snapshotDate: 1, shiftId: 1, orderId: 1 })

export const DashboardSnapshot = mongoose.model<IDashboardSnapshot>(
  'DashboardSnapshot',
  dashboardSnapshotSchema,
)
