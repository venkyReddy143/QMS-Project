import { Router } from 'express'
import {
  createPlan,
  deletePlan,
  getPlan,
  getPlanningOptions,
  listPlans,
  updatePlan,
} from '../controllers/planningController'
import { requireAuth } from '../middleware/auth'

export const planningRoutes = Router()

planningRoutes.use(requireAuth)

planningRoutes.get('/', listPlans)
planningRoutes.get('/options', getPlanningOptions)
planningRoutes.get('/:id', getPlan)
planningRoutes.post('/', createPlan)
planningRoutes.put('/:id', updatePlan)
planningRoutes.patch('/:id', updatePlan)
planningRoutes.delete('/:id', deletePlan)
