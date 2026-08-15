import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { User } from '../models/User'

interface AuthTokenPayload {
  sub: string
  role: string
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const header = req.headers.authorization ?? ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : ''

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Authentication required.',
      })
      return
    }

    const secret = process.env.JWT_SECRET
    if (!secret) {
      throw new Error('JWT_SECRET is not set')
    }

    const payload = jwt.verify(token, secret) as AuthTokenPayload
    const user = await User.findById(payload.sub)

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Account not found.',
      })
      return
    }

    req.user = user
    next()
  } catch {
    res.status(401).json({
      success: false,
      message: 'Invalid or expired token.',
    })
  }
}
