import type { NextFunction, Request, Response } from 'express'
import { Customer } from '../models/Customer'
import { Machine } from '../models/Machine'
import { ProcessRoute } from '../models/ProcessRoute'
import { ProcessStep } from '../models/ProcessStep'
import { Product } from '../models/Product'

export async function listCustomers(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const customers = await Customer.find({ status: 'ACTIVE' })
      .sort({ name: 1 })
      .lean()

    res.json({
      success: true,
      customers: customers.map((customer) => ({
        id: customer._id.toString(),
        name: customer.name,
      })),
    })
  } catch (error) {
    next(error)
  }
}

export async function listProducts(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const products = await Product.find({ status: 'ACTIVE' })
      .sort({ name: 1 })
      .lean()
    const productIds = products.map((product) => product._id)
    const routes = await ProcessRoute.find({
      productId: { $in: productIds },
      status: 'ACTIVE',
    })
      .populate('steps.processStepId')
      .sort({ version: -1 })
      .lean()

    const routeByProduct = new Map<string, (typeof routes)[number]>()
    for (const route of routes) {
      const key = route.productId.toString()
      if (!routeByProduct.has(key)) {
        routeByProduct.set(key, route)
      }
    }

    res.json({
      success: true,
      products: products.map((product) => {
        const route = routeByProduct.get(product._id.toString())
        const processSteps =
          route?.steps
            .slice()
            .sort((a, b) => a.sequence - b.sequence)
            .map((step) => {
              const master = step.processStepId as unknown as {
                name?: string
                code?: string
                category?: string
              }

              return {
                sequence: step.sequence,
                name: master.name ?? '',
                code: master.code ?? '',
                machineType: master.category ?? '',
                hoursPerPiece: step.standardHoursPerPiece,
              }
            }) ?? []

        return {
          id: product._id.toString(),
          productCode: product.productCode,
          name: product.name,
          description: product.description ?? '',
          uom: product.uom,
          unitRate: product.unitRate,
          processSteps,
        }
      }),
    })
  } catch (error) {
    next(error)
  }
}

export async function listProcessSteps(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const steps = await ProcessStep.find({ status: 'ACTIVE' })
      .sort({ name: 1 })
      .lean()

    res.json({
      success: true,
      processSteps: steps.map((step) => ({
        id: step._id.toString(),
        code: step.code,
        name: step.name,
        category: step.category,
        standardHoursPerPiece: step.standardHoursPerPiece,
        requiresQualityRelease: step.requiresQualityRelease,
      })),
    })
  } catch (error) {
    next(error)
  }
}

export async function listMachines(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const machines = await Machine.find({ active: true })
      .sort({ machineType: 1, machineCode: 1 })
      .lean()

    res.json({
      success: true,
      machines: machines.map((machine) => ({
        id: machine._id.toString(),
        machineCode: machine.machineCode,
        name: machine.name,
        machineType: machine.machineType,
        bay: machine.bay ?? '',
        maxHoursPerShift: machine.maxHoursPerShift,
        status: machine.status,
        maintenanceStatus: machine.maintenanceStatus ?? 'HEALTHY',
        active: machine.active,
      })),
    })
  } catch (error) {
    next(error)
  }
}
