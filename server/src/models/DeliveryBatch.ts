import mongoose, { Schema, type Types } from 'mongoose'
import {
  BATCH_STATUSES,
  ORDER_PRIORITIES,
  SERIAL_STATUSES,
  type BatchStatus,
  type OrderPriority,
  type SerialStatus,
} from '../constants/enums'

export interface IBatchSerial {
  serialNumber: string
  sequence: number
  status: SerialStatus
  currentProcessStepName?: string
  completedPercent?: number
  comments?: string
  machineId?: Types.ObjectId
  machineCode?: string
  shift?: string
  operatorId?: Types.ObjectId
  operatorName?: string
}

export interface IBatchMachine {
  machineId: Types.ObjectId
  machineCode: string
  machineName: string
}

export interface IProcessStepAttachment {
  url: string
  name: string
  mimeType?: string
  size?: number
  uploadedAt?: Date
}

export interface IBatchProcessMachine {
  processStepName: string
  sequence: number
  hoursPerPiece?: number
  attachments?: IProcessStepAttachment[]
  machineId?: Types.ObjectId
  machineCode?: string
  machineName?: string
  machines?: Array<{
    machineId: Types.ObjectId
    machineCode: string
    machineName: string
  }>
}

export interface IBatchAssignment {
  employeeId: Types.ObjectId
  employeeName: string
  shift: string
  assignedAt: Date
}

export interface IBatchTimeLog {
  employeeId: Types.ObjectId
  employeeName: string
  shift: string
  hours: number
  note?: string
  loggedAt: Date
}

export interface IDeliveryBatch {
  orderId: Types.ObjectId
  orderNo: string
  /** _id of the product line inside ProductionOrder.products */
  orderLineId?: Types.ObjectId
  productId?: Types.ObjectId
  productName?: string
  productDescription?: string
  drawingNumber?: string
  lineNumber?: number
  processStepName?: string
  processStepNames: string[]
  processMachines: IBatchProcessMachine[]
  batchNo: string
  plannedQuantity: number
  bufferQty: number
  totalBatchQty: number
  targetDispatchDate: Date
  priority: OrderPriority
  status: BatchStatus
  productionInCharge?: string
  completedQuantity: number
  dispatchedQuantity: number
  progressPercent: number
  assignments: IBatchAssignment[]
  timeLogs: IBatchTimeLog[]
  serials: IBatchSerial[]
  assignedMachines: IBatchMachine[]
  createdBy: Types.ObjectId
}

const deliveryBatchSchema = new Schema<IDeliveryBatch>(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'ProductionOrder',
      required: true,
    },
    orderNo: {
      type: String,
      trim: true,
      default: '',
    },
    orderLineId: {
      type: Schema.Types.ObjectId,
      index: true,
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
    },
    productName: {
      type: String,
      trim: true,
      default: '',
    },
    productDescription: {
      type: String,
      trim: true,
      default: '',
    },
    drawingNumber: {
      type: String,
      trim: true,
      default: '',
    },
    lineNumber: {
      type: Number,
      min: 1,
    },
    processStepName: {
      type: String,
      trim: true,
      default: '',
    },
    processStepNames: {
      type: [String],
      default: [],
    },
    processMachines: {
      type: [
        {
          processStepName: { type: String, required: true, trim: true },
          sequence: { type: Number, required: true, min: 1 },
          hoursPerPiece: { type: Number, min: 0, default: 0 },
          attachments: {
            type: [
              {
                url: { type: String, required: true, trim: true },
                name: { type: String, trim: true, default: '' },
                mimeType: { type: String, trim: true, default: '' },
                size: { type: Number, min: 0, default: 0 },
                uploadedAt: { type: Date, default: Date.now },
              },
            ],
            default: [],
          },
          machineId: { type: Schema.Types.ObjectId, ref: 'Machine' },
          machineCode: { type: String, trim: true, default: '' },
          machineName: { type: String, trim: true, default: '' },
          machines: {
            type: [
              {
                machineId: { type: Schema.Types.ObjectId, ref: 'Machine', required: true },
                machineCode: { type: String, trim: true, default: '' },
                machineName: { type: String, trim: true, default: '' },
              },
            ],
            default: [],
          },
        },
      ],
      default: [],
    },
    batchNo: {
      type: String,
      required: true,
      trim: true,
    },
    plannedQuantity: {
      type: Number,
      required: true,
      min: 1,
    },
    bufferQty: {
      type: Number,
      min: 0,
      default: 0,
    },
    totalBatchQty: {
      type: Number,
      required: true,
      min: 1,
    },
    targetDispatchDate: {
      type: Date,
      required: true,
    },
    priority: {
      type: String,
      enum: ORDER_PRIORITIES,
      required: true,
      default: 'NORMAL',
    },
    status: {
      type: String,
      enum: BATCH_STATUSES,
      required: true,
      default: 'OPEN',
    },
    productionInCharge: {
      type: String,
      trim: true,
      default: '',
    },
    completedQuantity: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    dispatchedQuantity: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    progressPercent: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 0,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    assignments: {
      type: [
        {
          employeeId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
          employeeName: { type: String, required: true, trim: true },
          shift: { type: String, required: true, trim: true },
          assignedAt: { type: Date, required: true, default: Date.now },
        },
      ],
      default: [],
    },
    timeLogs: {
      type: [
        {
          employeeId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
          employeeName: { type: String, required: true, trim: true },
          shift: { type: String, required: true, trim: true },
          hours: { type: Number, required: true, min: 0 },
          note: { type: String, trim: true, default: '' },
          loggedAt: { type: Date, required: true, default: Date.now },
        },
      ],
      default: [],
    },
    serials: {
      type: [
        {
          serialNumber: { type: String, required: true, trim: true },
          sequence: { type: Number, required: true, min: 1 },
          status: {
            type: String,
            enum: SERIAL_STATUSES,
            required: true,
            default: 'QUEUED',
          },
          currentProcessStepName: {
            type: String,
            trim: true,
            default: '',
          },
          completedPercent: {
            type: Number,
            min: 0,
            max: 100,
            default: 0,
          },
          comments: {
            type: String,
            trim: true,
            default: '',
          },
          machineId: {
            type: Schema.Types.ObjectId,
            ref: 'Machine',
          },
          machineCode: {
            type: String,
            trim: true,
            default: '',
          },
          shift: {
            type: String,
            trim: true,
            default: '',
          },
          operatorId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
          },
          operatorName: {
            type: String,
            trim: true,
            default: '',
          },
        },
      ],
      default: [],
    },
    assignedMachines: {
      type: [
        {
          machineId: {
            type: Schema.Types.ObjectId,
            ref: 'Machine',
            required: true,
          },
          machineCode: { type: String, required: true, trim: true },
          machineName: { type: String, required: true, trim: true },
        },
      ],
      default: [],
    },
  },
  { timestamps: true },
)

deliveryBatchSchema.index({ orderId: 1, batchNo: 1 }, { unique: true })
deliveryBatchSchema.index({ orderId: 1, targetDispatchDate: 1 })
deliveryBatchSchema.index({ 'serials.serialNumber': 1 }, { unique: true, sparse: true })

export const DeliveryBatch = mongoose.model<IDeliveryBatch>(
  'DeliveryBatch',
  deliveryBatchSchema,
)
