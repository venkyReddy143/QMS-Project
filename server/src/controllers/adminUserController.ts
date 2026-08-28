import type { NextFunction, Request, Response } from 'express'
import { USER_STATUSES, User, normalizeUserRole, type UserRole, type UserStatus } from '../models/User'
import { isValidMobile, normalizeMobile } from '../utils/phone'

interface UserBody {
  employeeCode?: string
  name?: string
  email?: string
  phone?: string
  password?: string
  role?: string
  status?: string
}

function isDuplicateKey(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code?: number }).code === 11000,
  )
}

function duplicateMessage(error: unknown): string {
  const key =
    error && typeof error === 'object' && 'keyPattern' in error
      ? Object.keys((error as { keyPattern?: Record<string, unknown> }).keyPattern ?? {})[0]
      : ''
  if (key === 'phone') return 'This phone number is already in use.'
  if (key === 'email') return 'This email is already in use.'
  if (key === 'employeeCode') return 'This employee code is already in use.'
  return 'A user with these details already exists.'
}

function mapRole(value: string | undefined): UserRole | undefined {
  return normalizeUserRole(value)
}

function mapStatus(value: string | undefined): UserStatus | undefined {
  const normalized = String(value ?? '').trim().toUpperCase()
  if (USER_STATUSES.includes(normalized as UserStatus)) {
    return normalized as UserStatus
  }
  return undefined
}

async function remainingSuperAdmins(excludeId?: string) {
  const filter: Record<string, unknown> = { role: 'SUPER_ADMIN', status: 'ACTIVE' }
  if (excludeId) {
    filter._id = { $ne: excludeId }
  }
  return User.countDocuments(filter)
}

export async function listUsers(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const users = await User.find().sort({ createdAt: -1 })
    res.json({
      success: true,
      users: users.map((user) => user.toAuthJSON()),
    })
  } catch (error) {
    next(error)
  }
}

export async function createUser(
  req: Request<unknown, unknown, UserBody>,
  res: Response,
  next: NextFunction,
) {
  try {
    const employeeCode = String(req.body.employeeCode ?? '').trim().toUpperCase()
    const name = String(req.body.name ?? '').trim()
    const email = String(req.body.email ?? '').trim().toLowerCase()
    const phone = normalizeMobile(req.body.phone)
    const password = String(req.body.password ?? '').trim()
    const role = mapRole(req.body.role)
    const status = mapStatus(req.body.status) ?? 'ACTIVE'

    if (!employeeCode || !name || !email || !phone || !password || !role) {
      res.status(400).json({
        success: false,
        message: 'Employee code, name, email, phone, password, and role are required.',
      })
      return
    }

    if (!isValidMobile(phone)) {
      res.status(400).json({
        success: false,
        message: 'Enter a valid 10-digit mobile number.',
      })
      return
    }

    if (password.length < 6) {
      res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters.',
      })
      return
    }

    const user = await User.create({
      employeeCode,
      name,
      email,
      phone,
      password,
      role,
      status,
    })

    res.status(201).json({
      success: true,
      message: 'User created.',
      user: user.toAuthJSON(),
    })
  } catch (error) {
    if (isDuplicateKey(error)) {
      res.status(409).json({
        success: false,
        message: duplicateMessage(error),
      })
      return
    }
    next(error)
  }
}

export async function updateUser(
  req: Request<{ id: string }, unknown, UserBody>,
  res: Response,
  next: NextFunction,
) {
  try {
    const user = await User.findById(req.params.id).select('+password')
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found.',
      })
      return
    }

    const nextRole = req.body.role !== undefined ? mapRole(req.body.role) : user.role
    const nextStatus =
      req.body.status !== undefined ? mapStatus(req.body.status) : user.status

    if (req.body.role !== undefined && !nextRole) {
      res.status(400).json({
        success: false,
        message: 'Select a valid role.',
      })
      return
    }

    if (req.body.status !== undefined && !nextStatus) {
      res.status(400).json({
        success: false,
        message: 'Select a valid status.',
      })
      return
    }

    const losingAdmin =
      user.role === 'SUPER_ADMIN' &&
      user.status === 'ACTIVE' &&
      (nextRole !== 'SUPER_ADMIN' || nextStatus !== 'ACTIVE')

    if (losingAdmin && (await remainingSuperAdmins(user._id.toString())) < 1) {
      res.status(400).json({
        success: false,
        message: 'At least one active Super Admin is required.',
      })
      return
    }

    if (req.body.employeeCode !== undefined) {
      user.employeeCode = String(req.body.employeeCode).trim().toUpperCase()
    }
    if (req.body.name !== undefined) {
      user.name = String(req.body.name).trim()
    }
    if (req.body.email !== undefined) {
      user.email = String(req.body.email).trim().toLowerCase()
    }
    if (req.body.phone !== undefined) {
      const phone = normalizeMobile(req.body.phone)
      if (!isValidMobile(phone)) {
        res.status(400).json({
          success: false,
          message: 'Enter a valid 10-digit mobile number.',
        })
        return
      }
      user.phone = phone
    }
    if (nextRole) user.role = nextRole
    if (nextStatus) user.status = nextStatus

    const password = String(req.body.password ?? '').trim()
    if (password) {
      if (password.length < 6) {
        res.status(400).json({
          success: false,
          message: 'Password must be at least 6 characters.',
        })
        return
      }
      user.password = password
    }

    await user.save()

    res.json({
      success: true,
      message: 'User updated.',
      user: user.toAuthJSON(),
    })
  } catch (error) {
    if (isDuplicateKey(error)) {
      res.status(409).json({
        success: false,
        message: duplicateMessage(error),
      })
      return
    }
    next(error)
  }
}

export async function deleteUser(
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
) {
  try {
    const user = await User.findById(req.params.id)
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found.',
      })
      return
    }

    if (req.user && user._id.toString() === req.user._id.toString()) {
      res.status(400).json({
        success: false,
        message: 'You cannot delete your own account.',
      })
      return
    }

    if (
      user.role === 'SUPER_ADMIN' &&
      user.status === 'ACTIVE' &&
      (await remainingSuperAdmins(user._id.toString())) < 1
    ) {
      res.status(400).json({
        success: false,
        message: 'At least one active Super Admin is required.',
      })
      return
    }

    await user.deleteOne()

    res.json({
      success: true,
      message: 'User deleted.',
    })
  } catch (error) {
    next(error)
  }
}
