import type { NextFunction, Request, Response } from 'express'
import type { Model } from 'mongoose'

/**
 * Generic save (create) + get (list / get-by-id) handlers for the QMS
 * execution collections. Only these two capabilities are wired for now —
 * update/delete are intentionally left out.
 */

function isDuplicateKey(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code?: number }).code === 11000,
  )
}

function isValidationError(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === 'object' &&
      'name' in error &&
      (error as { name?: string }).name === 'ValidationError',
  )
}

function serialize(doc: Record<string, unknown>): Record<string, unknown> {
  const { _id, __v, ...rest } = doc as Record<string, unknown> & {
    _id: { toString(): string }
  }
  void __v
  return { id: _id.toString(), ...rest }
}

export interface CrudHandlers {
  list: (req: Request, res: Response, next: NextFunction) => Promise<void>
  getOne: (
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction,
  ) => Promise<void>
  create: (req: Request, res: Response, next: NextFunction) => Promise<void>
}

/**
 * Build list/get/create handlers for a Mongoose model.
 *
 * - `list` supports simple equality filtering on any schema field via query
 *   string (e.g. `/api/serials?orderId=<id>&status=IN_PROGRESS`).
 * - `create` auto-fills `createdBy` from the authenticated user when the
 *   schema declares that field and the request body omits it.
 */
export function makeCrud<T>(model: Model<T>, label: string): CrudHandlers {
  async function list(req: Request, res: Response, next: NextFunction) {
    try {
      const filter: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(req.query)) {
        if (
          typeof value === 'string' &&
          value !== '' &&
          model.schema.path(key)
        ) {
          filter[key] = value
        }
      }

      const items = await model
        .find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .lean()

      res.json({
        success: true,
        items: items.map((item) => serialize(item as Record<string, unknown>)),
      })
    } catch (error) {
      next(error)
    }
  }

  async function getOne(
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const item = await model.findById(req.params.id).lean()

      if (!item) {
        res.status(404).json({
          success: false,
          message: `${label} not found.`,
        })
        return
      }

      res.json({
        success: true,
        item: serialize(item as Record<string, unknown>),
      })
    } catch (error) {
      next(error)
    }
  }

  async function create(req: Request, res: Response, next: NextFunction) {
    try {
      const payload: Record<string, unknown> = { ...req.body }

      if (
        model.schema.path('createdBy') &&
        payload.createdBy === undefined &&
        req.user
      ) {
        payload.createdBy = req.user._id
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const created = await model.create(payload as any)
      const plain = (created as { toObject(): Record<string, unknown> }).toObject()

      res.status(201).json({
        success: true,
        message: `${label} created.`,
        item: serialize(plain),
      })
    } catch (error) {
      if (isDuplicateKey(error)) {
        res.status(409).json({
          success: false,
          message: `${label} already exists.`,
        })
        return
      }

      if (isValidationError(error)) {
        res.status(400).json({
          success: false,
          message: (error as Error).message,
        })
        return
      }

      next(error)
    }
  }

  return { list, getOne, create }
}
