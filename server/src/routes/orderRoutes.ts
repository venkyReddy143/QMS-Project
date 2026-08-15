import { Router } from 'express'
import {
  createOrder,
  getOrder,
  listOrders,
} from '../controllers/orderController'
import { requireAuth } from '../middleware/auth'

export const orderRoutes = Router()

orderRoutes.use(requireAuth)
orderRoutes.post('/', createOrder)
orderRoutes.post('/createOrder', createOrder)
orderRoutes.get('/', listOrders)
orderRoutes.get('/:id', getOrder)
