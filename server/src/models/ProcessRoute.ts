import mongoose, { Schema, type Types } from 'mongoose'
import { ROUTE_STATUSES, type RouteStatus } from '../constants/enums'

export interface IProcessRouteStep {
  processStepId: Types.ObjectId
  sequence: number
  standardHoursPerPiece: number
}

export interface IProcessRoute {
  productId: Types.ObjectId
  routeCode: string
  version: number
  steps: IProcessRouteStep[]
  status: RouteStatus
  effectiveFrom?: Date
  effectiveTo?: Date
}

const processRouteSchema = new Schema<IProcessRoute>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    routeCode: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    version: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    steps: {
      type: [
        {
          processStepId: {
            type: Schema.Types.ObjectId,
            ref: 'ProcessStep',
            required: true,
          },
          sequence: { type: Number, required: true, min: 1 },
          standardHoursPerPiece: { type: Number, required: true, min: 0 },
        },
      ],
      required: true,
      validate: {
        validator: (steps: IProcessRouteStep[]) => steps.length > 0,
        message: 'A process route must have at least one step.',
      },
    },
    status: {
      type: String,
      enum: ROUTE_STATUSES,
      required: true,
      default: 'ACTIVE',
    },
    effectiveFrom: Date,
    effectiveTo: Date,
  },
  { timestamps: true },
)

processRouteSchema.index({ productId: 1, version: 1 }, { unique: true })

export const ProcessRoute = mongoose.model<IProcessRoute>(
  'ProcessRoute',
  processRouteSchema,
)
