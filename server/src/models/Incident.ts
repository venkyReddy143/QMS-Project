import mongoose, { Schema, type Types } from 'mongoose'
import { INCIDENT_STATUSES, type IncidentStatus } from '../constants/enums'

export interface IIncident {
  incidentNo: string
  handoverId?: Types.ObjectId
  machineId?: Types.ObjectId
  orderId?: Types.ObjectId
  type: string
  title: string
  description?: string
  loggedAt: Date
  estimatedDowntimeHours?: number
  actualDowntimeHours?: number
  status: IncidentStatus
  severity: string
  downstreamImpact?: string
  createdBy: Types.ObjectId
  resolvedBy?: Types.ObjectId
  resolvedAt?: Date
}

const incidentSchema = new Schema<IIncident>(
  {
    incidentNo: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    handoverId: {
      type: Schema.Types.ObjectId,
      ref: 'ShiftHandover',
    },
    machineId: {
      type: Schema.Types.ObjectId,
      ref: 'Machine',
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'ProductionOrder',
    },
    type: {
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    loggedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    estimatedDowntimeHours: {
      type: Number,
      min: 0,
    },
    actualDowntimeHours: {
      type: Number,
      min: 0,
    },
    status: {
      type: String,
      enum: INCIDENT_STATUSES,
      required: true,
      default: 'ACTIVE',
    },
    severity: {
      type: String,
      required: true,
      trim: true,
    },
    downstreamImpact: {
      type: String,
      trim: true,
      default: '',
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    resolvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    resolvedAt: {
      type: Date,
    },
  },
  { timestamps: true },
)

incidentSchema.index({ incidentNo: 1 }, { unique: true })
incidentSchema.index({ machineId: 1, status: 1 })
incidentSchema.index({ orderId: 1, loggedAt: -1 })

export const Incident = mongoose.model<IIncident>('Incident', incidentSchema)
