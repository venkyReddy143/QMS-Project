import type { NextFunction, Request, Response } from 'express'
import mongoose from 'mongoose'
import {
  STOCK_TRANSFER_TYPES,
  type InventorySerialStatus,
  type StockEntryType,
  type StockTransferType,
} from '../constants/enums'
import { InventoryBalance } from '../models/InventoryBalance'
import { InventorySerial } from '../models/InventorySerial'
import { Product } from '../models/Product'
import { StockMovement } from '../models/StockMovement'
import { User } from '../models/User'

function toNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function mapTransferType(value: unknown): StockTransferType | undefined {
  const normalized = String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_')
  if (STOCK_TRANSFER_TYPES.includes(normalized as StockTransferType)) {
    return normalized as StockTransferType
  }
  return undefined
}

function looksLikeObjectId(value: string): boolean {
  return mongoose.Types.ObjectId.isValid(value) && value.length === 24
}

const TRANSFER_STATUS: Record<StockTransferType, InventorySerialStatus> = {
  STORE_TO_OPERATOR: 'WITH_OPERATOR',
  OPERATOR_TO_STORE: 'IN_STORE',
  STORE_TO_VENDOR: 'WITH_VENDOR',
  VENDOR_TO_STORE: 'IN_STORE',
  STORE_TO_DISPOSE: 'DISPOSED',
  MISSING: 'MISSING',
}

function holderFromTransfer(
  transferType: StockTransferType,
  toPerson: { id?: mongoose.Types.ObjectId; name: string },
) {
  if (
    transferType === 'STORE_TO_OPERATOR' ||
    transferType === 'STORE_TO_VENDOR'
  ) {
    return {
      holderUserId: toPerson.id,
      holderName: toPerson.name,
    }
  }
  return { holderUserId: undefined as mongoose.Types.ObjectId | undefined, holderName: '' }
}

async function resolvePerson(idValue: unknown, nameValue: unknown) {
  const name = String(nameValue ?? '').trim()
  const id = String(idValue ?? '').trim()
  if (id && looksLikeObjectId(id)) {
    const user = await User.findById(id)
    if (user) {
      return { id: user._id, name: user.name }
    }
  }
  return { id: undefined, name }
}

async function onHandQty(productId: mongoose.Types.ObjectId, serial: boolean) {
  if (serial) {
    return InventorySerial.countDocuments({
      productId,
      status: 'IN_STORE',
    })
  }
  const balance = await InventoryBalance.findOne({ productId })
  return balance?.quantity ?? 0
}

export async function listInventory(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const products = await Product.find().sort({ productCode: 1 })
    const productIds = products.map((product) => product._id)
    const [balances, serials] = await Promise.all([
      InventoryBalance.find({ productId: { $in: productIds } }),
      InventorySerial.find({ productId: { $in: productIds } }).sort({
        serialNumber: 1,
      }),
    ])
    const qtyByProduct = new Map(
      balances.map((item) => [item.productId.toString(), item.quantity]),
    )
    const serialsByProduct = new Map<string, typeof serials>()
    for (const serial of serials) {
      const key = serial.productId.toString()
      const list = serialsByProduct.get(key) ?? []
      list.push(serial)
      serialsByProduct.set(key, list)
    }

    res.json({
      success: true,
      inventory: products.map((product) => {
        const key = product._id.toString()
        const productSerials = serialsByProduct.get(key) ?? []
        const onHand = product.isSerialControl
          ? productSerials.filter((item) => item.status === 'IN_STORE').length
          : qtyByProduct.get(key) ?? 0
        return {
          productId: key,
          productCode: product.productCode,
          name: product.name,
          uom: product.uom,
          productType: product.productType,
          isSerialControl: product.isSerialControl,
          onHandQty: onHand,
          serials: product.isSerialControl
            ? productSerials.map((item) => ({
                serialNumber: item.serialNumber,
                status: item.status,
                holderName: item.holderName ?? '',
              }))
            : [],
        }
      }),
    })
  } catch (error) {
    next(error)
  }
}

export async function createStockEntry(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required.',
      })
      return
    }

    const entryTypeRaw = String(req.body.entryType ?? '')
      .trim()
      .toUpperCase()
    const entryType: StockEntryType | undefined =
      entryTypeRaw === 'ISSUE' || entryTypeRaw === 'RECEIPT'
        ? entryTypeRaw
        : undefined
    if (!entryType) {
      res.status(400).json({
        success: false,
        message: 'Entry type must be Issue or Receipt.',
      })
      return
    }

    const productId = String(req.body.productId ?? '').trim()
    if (!productId || !looksLikeObjectId(productId)) {
      res.status(400).json({ success: false, message: 'Select a product.' })
      return
    }

    const product = await Product.findById(productId)
    if (!product) {
      res.status(404).json({ success: false, message: 'Product not found.' })
      return
    }

    const transferType = mapTransferType(req.body.transferType)
    if (!transferType) {
      res.status(400).json({
        success: false,
        message: 'Select a valid transfer type.',
      })
      return
    }

    const fromPerson = await resolvePerson(
      req.body.fromPersonId,
      req.body.fromPersonName,
    )
    const toPerson = await resolvePerson(
      req.body.toPersonId,
      req.body.toPersonName,
    )
    if (!fromPerson.name || !toPerson.name) {
      res.status(400).json({
        success: false,
        message: 'Issue from person and issue to person are required.',
      })
      return
    }

    const remarks = String(req.body.remarks ?? '').trim()
    const serialNumber = String(req.body.serialNumber ?? '')
      .trim()
      .toUpperCase()

    if (product.isSerialControl) {
      if (!serialNumber) {
        res.status(400).json({
          success: false,
          message: 'Serial number is required for this product.',
        })
        return
      }
      await applySerialMovement({
        entryType,
        product,
        serialNumber,
        transferType,
        toPerson,
      })
    } else {
      const quantity = toNumber(req.body.quantity)
      if (!quantity || quantity < 1) {
        res.status(400).json({
          success: false,
          message: 'Quantity must be at least 1.',
        })
        return
      }
      await applyQtyMovement({
        entryType,
        product,
        quantity,
        transferType,
      })
    }

    const movement = await StockMovement.create({
      entryType,
      productId: product._id,
      productCode: product.productCode,
      productName: product.name,
      isSerialControl: product.isSerialControl,
      serialNumber: product.isSerialControl ? serialNumber : '',
      quantity: product.isSerialControl ? 1 : toNumber(req.body.quantity) ?? 1,
      transferType,
      fromPersonId: fromPerson.id,
      fromPersonName: fromPerson.name,
      toPersonId: toPerson.id,
      toPersonName: toPerson.name,
      remarks,
      createdBy: req.user._id,
    })

    const onHand = await onHandQty(product._id, product.isSerialControl)

    res.status(201).json({
      success: true,
      message:
        entryType === 'ISSUE' ? 'Issue recorded.' : 'Receipt recorded.',
      movement: {
        id: movement._id.toString(),
        entryType: movement.entryType,
        productId: product._id.toString(),
        serialNumber: movement.serialNumber,
        quantity: movement.quantity,
        transferType: movement.transferType,
      },
      onHandQty: onHand,
    })
  } catch (error) {
    if (error instanceof Error && error.message) {
      res.status(400).json({ success: false, message: error.message })
      return
    }
    next(error)
  }
}

async function applySerialMovement(params: {
  entryType: StockEntryType
  product: { _id: mongoose.Types.ObjectId }
  serialNumber: string
  transferType: StockTransferType
  toPerson: { id?: mongoose.Types.ObjectId; name: string }
}) {
  const existing = await InventorySerial.findOne({
    productId: params.product._id,
    serialNumber: params.serialNumber,
  })
  const nextStatus = TRANSFER_STATUS[params.transferType]
  const holder = holderFromTransfer(params.transferType, params.toPerson)

  if (params.entryType === 'RECEIPT') {
    if (existing) {
      throw new Error('This serial number is already in inventory.')
    }
    await InventorySerial.create({
      productId: params.product._id,
      serialNumber: params.serialNumber,
      status:
        params.transferType === 'STORE_TO_OPERATOR' ||
        params.transferType === 'STORE_TO_VENDOR'
          ? nextStatus
          : 'IN_STORE',
      holderUserId: holder.holderUserId,
      holderName: holder.holderName,
    })
    return
  }

  if (!existing) {
    throw new Error('Serial number is not in inventory.')
  }

  const allowedFrom: Record<StockTransferType, InventorySerialStatus[]> = {
    STORE_TO_OPERATOR: ['IN_STORE'],
    STORE_TO_VENDOR: ['IN_STORE'],
    STORE_TO_DISPOSE: ['IN_STORE'],
    MISSING: ['IN_STORE', 'WITH_OPERATOR', 'WITH_VENDOR'],
    OPERATOR_TO_STORE: ['WITH_OPERATOR'],
    VENDOR_TO_STORE: ['WITH_VENDOR'],
  }
  if (!allowedFrom[params.transferType].includes(existing.status)) {
    throw new Error(
      `Serial ${params.serialNumber} is ${existing.status.replace(/_/g, ' ').toLowerCase()} and cannot use this transfer.`,
    )
  }

  existing.status = nextStatus
  existing.holderName = holder.holderName
  existing.holderUserId = holder.holderUserId
  await existing.save()
}

async function applyQtyMovement(params: {
  entryType: StockEntryType
  product: { _id: mongoose.Types.ObjectId }
  quantity: number
  transferType: StockTransferType
}) {
  const inbound =
    params.transferType === 'OPERATOR_TO_STORE' ||
    params.transferType === 'VENDOR_TO_STORE'
  const outbound =
    params.transferType === 'STORE_TO_OPERATOR' ||
    params.transferType === 'STORE_TO_VENDOR' ||
    params.transferType === 'STORE_TO_DISPOSE' ||
    params.transferType === 'MISSING'

  let delta = 0
  if (params.entryType === 'RECEIPT') {
    delta = inbound || !outbound ? params.quantity : -params.quantity
  } else {
    delta = inbound ? params.quantity : -params.quantity
  }

  const balance =
    (await InventoryBalance.findOne({ productId: params.product._id })) ??
    new InventoryBalance({ productId: params.product._id, quantity: 0 })

  const next = balance.quantity + delta
  if (next < 0) {
    throw new Error(
      `Not enough stock. On hand is ${balance.quantity} pcs.`,
    )
  }
  balance.quantity = next
  await balance.save()
}
