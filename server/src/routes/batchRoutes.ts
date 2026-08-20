import { Router } from 'express'
import {
  createBatch,
  getBatch,
  listBatches,
  updateBatch,
} from '../controllers/batchController'
import { requireAuth } from '../middleware/auth'

export const batchRoutes = Router()

batchRoutes.use(requireAuth)
batchRoutes.post('/createBatch', createBatch)
batchRoutes.get('/listBatches', listBatches)
batchRoutes.get('/getBatch/:id', getBatch)
batchRoutes.put('/updateBatch/:id', updateBatch)
batchRoutes.patch('/updateBatch/:id', updateBatch)
