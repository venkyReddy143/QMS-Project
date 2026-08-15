import { useState, type FormEvent } from 'react'
import { Factory, Lock, Phone } from 'lucide-react'
import {
  DEMO_USERS,
  formatPhoneDisplay,
  useAuth,
  type AuthUser,
} from '../context/AuthContext'

interface LoginScreenProps {
  onSuccess: (user: AuthUser) => void
}

export function LoginScreen({ onSuccess }: LoginScreenProps) {
  const { login } = useAuth()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function fillDemo(user: AuthUser) {
    setPhone(user.phone)
    setPassword(user.password)
    setError(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!phone.trim() || !password) {
      setError('Please enter phone number and password.')
      return
    }

    setLoading(true)
    const result = await login(phone, password)
    setLoading(false)

    if (!result.ok || !result.user) {
      setError(result.message ?? 'Login failed.')
      return
    }

    onSuccess(result.user)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4 py-8">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface-raised p-6 shadow-sm sm:p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-white">
            <Factory className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            Manufacturing Tracker
          </h1>
          <p className="mt-1 text-base text-muted">
            Order & Production Tracking System
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-sm font-semibold text-foreground">
              Phone Number
            </span>
            <div className="relative">
              <Phone className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
              <span className="pointer-events-none absolute left-10 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted">
                +91
              </span>
              <input
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                value={phone}
                onChange={(event) =>
                  setPhone(event.target.value.replace(/[^\d]/g, '').slice(0, 10))
                }
                placeholder="10-digit mobile number"
                className="min-h-12 w-full rounded-xl border border-border bg-surface-muted pl-[4.5rem] pr-3 text-base outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            </div>
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-semibold text-foreground">Password</span>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter password"
                className="min-h-12 w-full rounded-xl border border-border bg-surface-muted pl-11 pr-3 text-base outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            </div>
          </label>

          {error ? (
            <div className="rounded-xl border border-danger/30 bg-red-50 px-3 py-3 text-sm font-medium text-danger">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="min-h-12 w-full rounded-xl bg-accent text-base font-bold text-white transition hover:brightness-110 disabled:opacity-70"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 border-t border-border pt-4">
          <p className="mb-2 text-sm font-semibold text-foreground">
            Quick demo logins
          </p>
          <div className="space-y-2">
            {DEMO_USERS.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => fillDemo(user)}
                className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-border bg-surface-muted px-3 text-left text-sm transition hover:border-accent"
              >
                <span className="font-semibold text-foreground">{user.role}</span>
                <span className="truncate text-muted">
                  {formatPhoneDisplay(user.phone)}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
