import bcrypt from 'bcryptjs'
import mongoose, { Schema, type HydratedDocument, type Model } from 'mongoose'
import { normalizeMobile } from '../utils/phone'

export const USER_ROLES = [
  'SHOP_FLOOR_OPERATOR',
  'SUPERVISOR',
  'MANAGER',
] as const

export const USER_STATUSES = ['ACTIVE', 'INACTIVE'] as const

export type UserRole = (typeof USER_ROLES)[number]
export type UserStatus = (typeof USER_STATUSES)[number]

export interface AuthUserJSON {
  id: string
  employeeCode: string
  name: string
  email: string
  phone: string
  role: UserRole
  status: UserStatus
  lastLoginAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface IUser {
  employeeCode: string
  name: string
  email: string
  phone: string
  password: string
  role: UserRole
  status: UserStatus
  lastLoginAt?: Date
  createdAt: Date
  updatedAt: Date
}

export interface IUserMethods {
  comparePassword(plainPassword: string): Promise<boolean>
  toAuthJSON(): AuthUserJSON
}

export type IUserDocument = HydratedDocument<IUser, IUserMethods>

type UserModel = Model<IUser, Record<string, never>, IUserMethods>

const userSchema = new Schema<IUser, UserModel, IUserMethods>(
  {
    employeeCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
      minlength: 6,
    },
    role: {
      type: String,
      enum: USER_ROLES,
      required: true,
    },
    status: {
      type: String,
      enum: USER_STATUSES,
      required: true,
      default: 'ACTIVE',
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
)

userSchema.pre('save', async function hashPassword() {
  if (this.phone) {
    this.phone = normalizeMobile(this.phone)
  }

  if (!this.isModified('password')) {
    return
  }

  const salt = await bcrypt.genSalt(10)
  this.password = await bcrypt.hash(this.password, salt)
})

userSchema.methods.comparePassword = function comparePassword(
  this: IUserDocument,
  plainPassword: string,
) {
  return bcrypt.compare(plainPassword, this.password)
}

userSchema.methods.toAuthJSON = function toAuthJSON(this: IUserDocument) {
  return {
    id: this._id.toString(),
    employeeCode: this.employeeCode,
    name: this.name,
    email: this.email,
    phone: this.phone,
    role: this.role,
    status: this.status,
    lastLoginAt: this.lastLoginAt ?? null,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  }
}

export const User = mongoose.model<IUser, UserModel>('User', userSchema)
