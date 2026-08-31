import { Router } from 'express'
import {
  adminSummary,
  createCalendar,
  createCustomer,
  createMachine,
  createMachineType,
  createProcessStep,
  createProduct,
  deleteCalendar,
  deleteCustomer,
  deleteMachine,
  deleteMachineType,
  deleteProcessStep,
  deleteProduct,
  listAdminCalendars,
  listAdminCustomers,
  listAdminMachines,
  listAdminMachineTypes,
  listAdminProcessSteps,
  listAdminProducts,
  getCalendarDayStats,
  getCalendarHistory,
  updateCalendar,
  updateCustomer,
  updateMachine,
  updateMachineType,
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

adminRoutes.get('/machine-types', listAdminMachineTypes)
adminRoutes.post('/machine-types', createMachineType)
adminRoutes.patch('/machine-types/:id', updateMachineType)
adminRoutes.delete('/machine-types/:id', deleteMachineType)

adminRoutes.get('/calendars', listAdminCalendars)
adminRoutes.get('/calendars/day-stats', getCalendarDayStats)
adminRoutes.get('/calendars/history', getCalendarHistory)
adminRoutes.post('/calendars', createCalendar)
adminRoutes.patch('/calendars/:id', updateCalendar)
adminRoutes.delete('/calendars/:id', deleteCalendar)
