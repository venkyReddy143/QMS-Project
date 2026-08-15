import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type UserRole =
  | 'Order Creator'
  | 'Production Manager'
  | 'Floor Manager'

export interface AuthUser {
  id: string
  phone: string
  password: string
  name: string
  role: UserRole
  defaultPath: string
  accessPaths: string[]
}

export const DEMO_USERS: AuthUser[] = [
  {
    id: 'order-creator',
    phone: '9876543210',
    password: 'order123',
    name: 'Meera Joshi',
    role: 'Order Creator',
    defaultPath: '/create-order',
    accessPaths: ['/create-order'],
  },
  {
    id: 'prod-manager',
    phone: '9123456780',
    password: 'prod123',
    name: 'Ananya Mehta',
    role: 'Production Manager',
    defaultPath: '/orders',
    accessPaths: ['/orders', '/production-planning', '/my-tasks'],
  },
  {
    id: 'floor-manager',
    phone: '9988776655',
    password: 'floor123',
    name: 'Ravi Kumar',
    role: 'Floor Manager',
    defaultPath: '/orders',
    accessPaths: ['/orders', '/production-planning', '/my-tasks'],
  },
]

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

interface AuthContextValue {
  isAuthenticated: boolean
  user: AuthUser | null
  userRole: UserRole | null
  userName: string | null
  login: (
    phone: string,
    password: string,
  ) => Promise<{ ok: boolean; message?: string; user?: AuthUser }>
  logout: () => void
  canAccess: (path: string) => boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)
const STORAGE_KEY = 'qms-factory-auth'

function readStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { id: string }
    return DEMO_USERS.find((user) => user.id === parsed.id) ?? null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => readStoredUser())

  const persistUser = useCallback((next: AuthUser | null) => {
    setUser(next)
    if (next) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ id: next.id }))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [])

  const login = useCallback(
    async (phone: string, password: string) => {
      await new Promise((resolve) => window.setTimeout(resolve, 450))

      const phoneDigits = normalizePhone(phone)
      const matched = DEMO_USERS.find(
        (demo) =>
          normalizePhone(demo.phone) === phoneDigits &&
          demo.password === password,
      )

      if (!matched) {
        return { ok: false, message: 'Wrong phone number or password.' }
      }

      persistUser(matched)
      return { ok: true, user: matched }
    },
    [persistUser],
  )

  const logout = useCallback(() => {
    persistUser(null)
  }, [persistUser])

  const canAccess = useCallback(
    (path: string) => {
      if (!user) return false
      return user.accessPaths.some(
        (allowed) => path === allowed || path.startsWith(`${allowed}/`),
      )
    },
    [user],
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated: Boolean(user),
      user,
      userRole: user?.role ?? null,
      userName: user?.name ?? null,
      login,
      logout,
      canAccess,
    }),
    [user, login, logout, canAccess],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
