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

export interface IOrderProductLine {
  productId: Types.ObjectId
  productCode: string
  productName: string
  quantity: number
  uom: string
  unitRate: number
  estimationPrice: number
  primaryMachineId?: Types.ObjectId
  primaryMachineType?: string
  processSteps: IOrderProcessStep[]
}

export interface IProductionOrder {
  orderNo: string
  customerName?: string
  customerPoRef: string
  products: IOrderProductLine[]
  productId?: Types.ObjectId
  productCodeSnapshot?: string
  productNameSnapshot?: string
  totalQuantity: number
  uom: string
  budget?: number
  estimationPrice: number
  routeId?: Types.ObjectId
  processSteps: IOrderProcessStep[]
  primaryMachineType?: string
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

const orderProductLineSchema = new Schema<IOrderProductLine>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    productCode: {
      type: String,
      required: true,
      trim: true,
    },
    productName: {
      type: String,
      required: true,
      trim: true,
    },
    quantity: {
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
    unitRate: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    estimationPrice: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    primaryMachineId: {
      type: Schema.Types.ObjectId,
      ref: 'Machine',
    },
    primaryMachineType: {
      type: String,
      trim: true,
      default: '',
    },
    processSteps: {
      type: [orderProcessStepSchema],
      default: [],
    },
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
      trim: true,
      default: '',
    },
    customerPoRef: {
      type: String,
      required: true,
      trim: true,
    },
    products: {
      type: [orderProductLineSchema],
      default: [],
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
    },
    productCodeSnapshot: {
      type: String,
      trim: true,
    },
    productNameSnapshot: {
      type: String,
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
      default: [],
    },
    primaryMachineType: {
      type: String,
      trim: true,
      default: '',
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
