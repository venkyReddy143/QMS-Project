import { Router } from 'express'
import {
  createOrder,
  getOrder,
  listOrders,
} from '../controllers/orderController'
import { createBatch, listBatches } from '../controllers/batchController'
import { requireAuth } from '../middleware/auth'

export const orderRoutes = Router()

orderRoutes.use(requireAuth)
orderRoutes.post('/createOrder', createOrder)
orderRoutes.get('/', listOrders)
orderRoutes.post('/:orderId/batches', createBatch)
orderRoutes.get('/:orderId/batches', listBatches)
orderRoutes.get('/:id', getOrder)
