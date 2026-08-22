import { Router } from 'express'
import {
  createOrder,
  getOrder,
  listOrders,
  updateOrderPlanning,
} from '../controllers/orderController'
import {
  assignBatch,
  createBatch,
  listBatches,
  logBatchTime,
} from '../controllers/batchController'
import { requireAuth } from '../middleware/auth'

export const orderRoutes = Router()

orderRoutes.use(requireAuth)
orderRoutes.post('/createOrder', createOrder)
orderRoutes.get('/', listOrders)
orderRoutes.post('/:orderId/batches', createBatch)
orderRoutes.get('/:orderId/batches', listBatches)
orderRoutes.post('/:orderId/batches/:batchId/assign', assignBatch)
orderRoutes.post('/:orderId/batches/:batchId/time-logs', logBatchTime)
orderRoutes.patch('/:id/planning', updateOrderPlanning)
orderRoutes.get('/:id', getOrder)
