import mongoose, { Schema, type Types } from 'mongoose'
import {
  ORDER_PRIORITIES,
  ORDER_STATUSES,
  type OrderPriority,
  type OrderStatus,
} from '../constants/enums'

export interface IOrderProcessStep {
  sequence: number
  name: string
  code?: string
  machineType: string
  hoursPerPiece: number
  isCustom: boolean
}

export interface IProductionOrder {
  orderNo: string
  customerName: string
  customerPoRef: string
  productId: Types.ObjectId
  productCodeSnapshot: string
  productNameSnapshot: string
  totalQuantity: number
  uom: string
  budget?: number
  estimationPrice: number
  routeId?: Types.ObjectId
  processSteps: IOrderProcessStep[]
  primaryMachineType: string
  additionalMachineTypes: string[]
  dueDate: Date
  priority: OrderPriority
  notes?: string
  status: OrderStatus
  createdBy: Types.ObjectId
}

const orderProcessStepSchema = new Schema<IOrderProcessStep>(
  {
    sequence: { type: Number, required: true, min: 1 },
    name: { type: String, required: true, trim: true },
    code: { type: String, trim: true, uppercase: true },
    machineType: { type: String, required: true, trim: true },
    hoursPerPiece: { type: Number, required: true, min: 0 },
    isCustom: { type: Boolean, required: true, default: false },
  },
  { _id: false },
)

const productionOrderSchema = new Schema<IProductionOrder>(
  {
    orderNo: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    customerName: {
      type: String,
      required: true,
      trim: true,
    },
    customerPoRef: {
      type: String,
      required: true,
      trim: true,
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    productCodeSnapshot: {
      type: String,
      required: true,
      trim: true,
    },
    productNameSnapshot: {
      type: String,
      required: true,
      trim: true,
    },
    totalQuantity: {
      type: Number,
      required: true,
      min: 1,
    },
    uom: {
      type: String,
      required: true,
      default: 'PCS',
      uppercase: true,
      trim: true,
    },
    budget: {
      type: Number,
      min: 0,
    },
    estimationPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    routeId: {
      type: Schema.Types.ObjectId,
      ref: 'ProcessRoute',
    },
    processSteps: {
      type: [orderProcessStepSchema],
      required: true,
      validate: {
        validator: (steps: IOrderProcessStep[]) => steps.length > 0,
        message: 'At least one process step is required.',
      },
    },
    primaryMachineType: {
      type: String,
      required: true,
      trim: true,
    },
    additionalMachineTypes: {
      type: [String],
      default: [],
    },
    dueDate: {
      type: Date,
      required: true,
    },
    priority: {
      type: String,
      enum: ORDER_PRIORITIES,
      required: true,
      default: 'NORMAL',
    },
    notes: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ORDER_STATUSES,
      required: true,
      default: 'RELEASED',
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true },
)

productionOrderSchema.index({ productId: 1, status: 1 })
productionOrderSchema.index({ customerPoRef: 1 })

export const ProductionOrder = mongoose.model<IProductionOrder>(
  'ProductionOrder',
  productionOrderSchema,
)
