import type { NextFunction, Request, Response } from 'express'
import jwt, { type SignOptions } from 'jsonwebtoken'
import { User, type IUserDocument } from '../models/User'
import { isValidMobile, normalizeMobile } from '../utils/phone'

interface LoginBody {
  mobile?: string
  phone?: string
  mobileNumber?: string
  password?: string
}

function signToken(user: IUserDocument): string {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET is not set')
  }

  const options: SignOptions = {
    expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as SignOptions['expiresIn'],
  }

  return jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role,
      employeeCode: user.employeeCode,
    },
    secret,
    options,
  )
}

function readPhone(body: LoginBody): string {
  return normalizeMobile(body.phone ?? body.mobile ?? body.mobileNumber ?? '')
}

export async function login(
  req: Request<unknown, unknown, LoginBody>,
  res: Response,
  next: NextFunction,
) {
  try {
    const phone = readPhone(req.body)
    const password = String(req.body.password ?? '')

    if (!phone || !password) {
      res.status(400).json({
        success: false,
        message: 'Mobile number and password are required.',
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

    const user = await User.findOne({ phone }).select('+password')

    if (!user || !(await user.comparePassword(password))) {
      res.status(401).json({
        success: false,
        message: 'Wrong mobile number or password.',
      })
      return
    }

    if (user.status !== 'ACTIVE') {
      res.status(403).json({
        success: false,
        message: 'Account is not active.',
      })
      return
    }

    user.lastLoginAt = new Date()
    await user.save()

    res.json({
      success: true,
      message: 'Login successful.',
      token: signToken(user),
      user: user.toAuthJSON(),
    })
  } catch (error) {
    next(error)
  }
}

export function me(req: Request, res: Response) {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required.',
    })
    return
  }

  res.json({
    success: true,
    user: req.user.toAuthJSON(),
  })
}
