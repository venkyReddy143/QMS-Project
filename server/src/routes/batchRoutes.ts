import { Router } from 'express'
import {
  createBatch,
  getBatch,
  listBatches,
  updateBatch,
  activateBatch,
  updateBatchProcessSteps,
  updateBatchSerials,
  assignSerialsToShift,
  uploadProcessStepAttachments,
} from '../controllers/batchController'
import { requireAuth } from '../middleware/auth'
import { uploadProcessStepFiles } from '../middleware/upload'

export const batchRoutes = Router()

batchRoutes.use(requireAuth)
batchRoutes.post('/createBatch', createBatch)
batchRoutes.post(
  '/process-step-attachments',
  uploadProcessStepFiles,
  uploadProcessStepAttachments,
)
batchRoutes.get('/listBatches', listBatches)
batchRoutes.get('/getBatch/:id', getBatch)
batchRoutes.put('/updateBatch/:id', updateBatch)
batchRoutes.patch('/updateBatch/:id', updateBatch)
batchRoutes.patch('/:batchId/process-steps', updateBatchProcessSteps)
batchRoutes.post('/:batchId/activate', activateBatch)
batchRoutes.post('/:batchId/serials', updateBatchSerials)
batchRoutes.post('/:batchId/assign-serials', assignSerialsToShift)
