export type ApiUserRole =
  | 'MANAGER'
  | 'SUPERVISOR'
  | 'SHOP_FLOOR_OPERATOR'
  | 'SUPER_ADMIN'

export type UserRole =
  | 'Order Creator'
  | 'Production Manager'
  | 'Floor Manager'
  | 'Super Admin'

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
    defaultPath: '/orders',
    accessPaths: ['/orders', '/create-order'],
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
  SUPER_ADMIN: {
    role: 'Super Admin',
    defaultPath: '/dashboard',
    accessPaths: [
      '/dashboard',
      '/admin',
      '/orders',
      '/create-order',
      '/production-planning',
      '/my-tasks',
    ],
  },
}

export function normalizeApiRole(role: string | undefined): ApiUserRole {
  const key = String(role ?? '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_')

  if (key === 'SUPER_ADMIN' || key === 'SUPERADMIN') return 'SUPER_ADMIN'
  if (key === 'MANAGER' || key === 'ORDER_CREATOR') return 'MANAGER'
  if (key === 'SHOP_FLOOR_OPERATOR' || key === 'FLOOR_MANAGER') {
    return 'SHOP_FLOOR_OPERATOR'
  }
  return 'SUPERVISOR'
}

export function mapApiUser(user: ApiUser): AuthUser {
  const apiRole = normalizeApiRole(user.role)
  const access = ROLE_ACCESS[apiRole]

  return {
    id: user.id,
    employeeCode: user.employeeCode,
    phone: user.phone,
    name: user.name,
    email: user.email,
    apiRole,
    ...access,
  }
}

export function canAccessPath(user: AuthUser | null, path: string): boolean {
  if (!user) return false
  return user.accessPaths.some(
    (allowed) => path === allowed || path.startsWith(`${allowed}/`),
  )
}

export function canCreateOrders(role?: UserRole | null): boolean {
  return role === 'Order Creator' || role === 'Super Admin'
}

export function canPlanProduction(role?: UserRole | null): boolean {
  return (
    role === 'Production Manager' ||
    role === 'Floor Manager' ||
    role === 'Super Admin'
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
