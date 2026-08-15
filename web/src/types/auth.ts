export type ApiUserRole = 'MANAGER' | 'SUPERVISOR' | 'SHOP_FLOOR_OPERATOR'

export type UserRole =
  | 'Order Creator'
  | 'Production Manager'
  | 'Floor Manager'

export interface ApiUser {
  id: string
  employeeCode: string
  name: string
  email: string
  phone: string
  role: ApiUserRole
  status: 'ACTIVE' | 'INACTIVE'
  lastLoginAt: string | null
  createdAt: string
  updatedAt: string
}

export interface AuthUser {
  id: string
  employeeCode: string
  phone: string
  name: string
  email: string
  apiRole: ApiUserRole
  role: UserRole
  defaultPath: string
  accessPaths: string[]
}

export interface LoginRequest {
  phone: string
  password: string
}

export interface LoginResponse {
  success: boolean
  message: string
  token: string
  user: ApiUser
}

export interface MeResponse {
  success: boolean
  user: ApiUser
}

const ROLE_ACCESS: Record<
  ApiUserRole,
  Pick<AuthUser, 'role' | 'defaultPath' | 'accessPaths'>
> = {
  MANAGER: {
    role: 'Order Creator',
    defaultPath: '/create-order',
    accessPaths: ['/create-order'],
  },
  SUPERVISOR: {
    role: 'Production Manager',
    defaultPath: '/orders',
    accessPaths: ['/orders', '/production-planning', '/my-tasks'],
  },
  SHOP_FLOOR_OPERATOR: {
    role: 'Floor Manager',
    defaultPath: '/orders',
    accessPaths: ['/orders', '/production-planning', '/my-tasks'],
  },
}

export function mapApiUser(user: ApiUser): AuthUser {
  const access = ROLE_ACCESS[user.role] ?? ROLE_ACCESS.SUPERVISOR

  return {
    id: user.id,
    employeeCode: user.employeeCode,
    phone: user.phone,
    name: user.name,
    email: user.email,
    apiRole: user.role,
    ...access,
  }
}

export function canAccessPath(user: AuthUser | null, path: string): boolean {
  if (!user) return false
  return user.accessPaths.some(
    (allowed) => path === allowed || path.startsWith(`${allowed}/`),
  )
}

export function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, '')
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2)
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return digits.slice(1)
  }
  return digits
}

export function formatPhoneDisplay(phone: string): string {
  const normalized = normalizePhone(phone)
  if (normalized.length !== 10) return phone
  return `+91 ${normalized.slice(0, 5)} ${normalized.slice(5)}`
}
