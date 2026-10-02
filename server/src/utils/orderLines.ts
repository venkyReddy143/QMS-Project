import mongoose from 'mongoose'
import { ProductionOrder } from '../models/ProductionOrder'

/**
 * Orders created before product lines had their own _id have none stored.
 * Persist one for each such line so batches can reference it via orderLineId.
 * Returns true when anything was written.
 */
export async function ensureOrderLineIds(orderId: unknown): Promise<boolean> {
  const idText = String(orderId ?? '')
  if (!mongoose.isValidObjectId(idText)) return false
  const _id = new mongoose.Types.ObjectId(idText)
  const raw = await ProductionOrder.collection.findOne(
    { _id },
    { projection: { products: 1 } },
  )
  const lines = (raw?.products ?? []) as Array<{ _id?: unknown }>
  const $set: Record<string, unknown> = {}
  lines.forEach((line, index) => {
    if (!line._id) $set[`products.${index}._id`] = new mongoose.Types.ObjectId()
  })
  if (Object.keys($set).length === 0) return false
  await ProductionOrder.collection.updateOne({ _id }, { $set })
  return true
}
