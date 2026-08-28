import { Router } from 'express'
import {
  adminSummary,
  createCustomer,
  createMachine,
  createProcessStep,
  createProduct,
  deleteCustomer,
  deleteMachine,
  deleteProcessStep,
  deleteProduct,
  listAdminCustomers,
  listAdminMachines,
  listAdminProcessSteps,
  listAdminProducts,
  updateCustomer,
  updateMachine,
  updateProcessStep,
  updateProduct,
} from '../controllers/adminMasterController'
import {
  createUser,
  deleteUser,
  listUsers,
  updateUser,
} from '../controllers/adminUserController'
import { requireAuth, requireSuperAdmin } from '../middleware/auth'

export const adminRoutes = Router()

adminRoutes.use(requireAuth, requireSuperAdmin)

adminRoutes.get('/summary', adminSummary)

adminRoutes.get('/users', listUsers)
adminRoutes.post('/users', createUser)
adminRoutes.patch('/users/:id', updateUser)
adminRoutes.delete('/users/:id', deleteUser)

adminRoutes.get('/machines', listAdminMachines)
adminRoutes.post('/machines', createMachine)
adminRoutes.patch('/machines/:id', updateMachine)
adminRoutes.delete('/machines/:id', deleteMachine)

adminRoutes.get('/products', listAdminProducts)
adminRoutes.post('/products', createProduct)
adminRoutes.patch('/products/:id', updateProduct)
adminRoutes.delete('/products/:id', deleteProduct)

adminRoutes.get('/process-steps', listAdminProcessSteps)
adminRoutes.post('/process-steps', createProcessStep)
adminRoutes.patch('/process-steps/:id', updateProcessStep)
adminRoutes.delete('/process-steps/:id', deleteProcessStep)

adminRoutes.get('/customers', listAdminCustomers)
adminRoutes.post('/customers', createCustomer)
adminRoutes.patch('/customers/:id', updateCustomer)
adminRoutes.delete('/customers/:id', deleteCustomer)
