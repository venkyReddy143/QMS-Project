import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type UserRole =
  | 'Production Manager'
  | 'Machine Operator'
  | 'Shift Supervisor'
  | 'System Admin'

export interface AuthUser {
  id: string
  email: string
  password: string
  name: string
  role: UserRole
  avatarUrl: string
  defaultPath: string
  accessPaths: string[]
  accessSummary: string
}

export const DEMO_USERS: AuthUser[] = [
  {
    id: 'prod-manager',
    email: 'prod.manager@manufacturing.com',
    password: 'Manager@123',
    name: 'Ananya Mehta',
    role: 'Production Manager',
    avatarUrl:
      'https://api.dicebear.com/9.x/avataaars/svg?seed=AnanyaMehta&backgroundColor=0e7490',
    defaultPath: '/batch-scheduling',
    accessPaths: [
      '/batch-scheduling',
      '/capacity-planning',
      '/dispatch',
      '/executive-dashboard',
    ],
    accessSummary: 'Delivery Scheduling, Machine Planning, Analytics',
  },
  {
    id: 'operator-kumar',
    email: 'operator.kumar@manufacturing.com',
    password: 'Operator@123',
    name: 'Ravi Kumar',
    role: 'Machine Operator',
    avatarUrl:
      'https://api.dicebear.com/9.x/avataaars/svg?seed=RaviKumar&backgroundColor=164e63',
    defaultPath: '/daily-progress',
    accessPaths: ['/daily-progress'],
    accessSummary: 'Shop Floor Capture & Serial Tracking',
  },
  {
    id: 'supervisor-patel',
    email: 'supervisor.patel@manufacturing.com',
    password: 'Supervisor@123',
    name: 'S. Patel',
    role: 'Shift Supervisor',
    avatarUrl:
      'https://api.dicebear.com/9.x/avataaars/svg?seed=SPatel&backgroundColor=b45309',
    defaultPath: '/shift-handover',
    accessPaths: ['/shift-handover', '/daily-progress'],
    accessSummary: 'Shift Handover & Deviations',
  },
  {
    id: 'system-admin',
    email: 'admin@manufacturing.com',
    password: 'Admin@123',
    name: 'Priya Nair',
    role: 'System Admin',
    avatarUrl:
      'https://api.dicebear.com/9.x/avataaars/svg?seed=PriyaNair&backgroundColor=334155',
    defaultPath: '/executive-dashboard',
    accessPaths: [
      '/batch-scheduling',
      '/daily-progress',
      '/capacity-planning',
      '/shift-handover',
      '/dispatch',
      '/executive-dashboard',
    ],
    accessSummary: 'Full Master Data & Config Access',
  },
]

interface AuthContextValue {
  isAuthenticated: boolean
  user: AuthUser | null
  userRole: UserRole | null
  userName: string | null
  login: (email: string, password: string, remember?: boolean) => Promise<boolean>
  loginAsDemo: (userId: string) => void
  logout: () => void
  canAccess: (path: string) => boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)
const STORAGE_KEY = 'qms-auth-user'

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

  const persistUser = useCallback((next: AuthUser | null, remember = true) => {
    setUser(next)
    if (next && remember) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ id: next.id }))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [])

  const login = useCallback(
    async (email: string, password: string, remember = true) => {
      await new Promise((resolve) => window.setTimeout(resolve, 700))
      const matched = DEMO_USERS.find(
        (demo) =>
          demo.email.toLowerCase() === email.trim().toLowerCase() &&
          demo.password === password,
      )
      if (!matched) return false
      persistUser(matched, remember)
      return true
    },
    [persistUser],
  )

  const loginAsDemo = useCallback(
    (userId: string) => {
      const matched = DEMO_USERS.find((demo) => demo.id === userId)
      if (!matched) return
      persistUser(matched, true)
    },
    [persistUser],
  )

  const logout = useCallback(() => {
    persistUser(null)
  }, [persistUser])

  const canAccess = useCallback(
    (path: string) => {
      if (!user) return false
      if (user.role === 'System Admin') return true
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
      loginAsDemo,
      logout,
      canAccess,
    }),
    [user, login, loginAsDemo, logout, canAccess],
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
