import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from 'react'
import { canAccessPath } from '../types/auth'
import type { AuthUser, UserRole } from '../types/auth'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { login as loginThunk, logout as logoutAction } from '../store/slices/authSlice'

export type { AuthUser, UserRole } from '../types/auth'
export { formatPhoneDisplay, normalizePhone } from '../types/auth'

interface AuthContextValue {
  isAuthenticated: boolean
  isBootstrapping: boolean
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch()
  const user = useAppSelector((state) => state.auth.user)
  const status = useAppSelector((state) => state.auth.status)

  const login = useCallback(
    async (phone: string, password: string) => {
      try {
        const nextUser = await dispatch(loginThunk({ phone, password })).unwrap()
        return { ok: true as const, user: nextUser }
      } catch (error) {
        return {
          ok: false as const,
          message: typeof error === 'string' ? error : 'Login failed.',
        }
      }
    },
    [dispatch],
  )

  const logout = useCallback(() => {
    dispatch(logoutAction())
  }, [dispatch])

  const canAccess = useCallback(
    (path: string) => canAccessPath(user, path),
    [user],
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated: Boolean(user),
      isBootstrapping: status === 'bootstrapping',
      user,
      userRole: user?.role ?? null,
      userName: user?.name ?? null,
      login,
      logout,
      canAccess,
    }),
    [user, status, login, logout, canAccess],
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
