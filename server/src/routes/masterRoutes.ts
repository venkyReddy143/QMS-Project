import { Router } from 'express'
import {
  listCustomers,
  listEmployees,
  listMachines,
  listProcessSteps,
  listProducts,
} from '../controllers/masterController'
import { requireAuth } from '../middleware/auth'

export const masterRoutes = Router()

masterRoutes.use(requireAuth)
masterRoutes.get('/customers', listCustomers)
masterRoutes.get('/products', listProducts)
masterRoutes.get('/process-steps', listProcessSteps)
masterRoutes.get('/machines', listMachines)
masterRoutes.get('/employees', listEmployees)
