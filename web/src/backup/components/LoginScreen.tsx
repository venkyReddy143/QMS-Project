import { useState, type FormEvent } from 'react'
import {
  Eye,
  EyeOff,
  Factory,
  Fan,
  Gauge,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
} from 'lucide-react'
import { DEMO_USERS, useAuth, type AuthUser } from '../context/AuthContext'

interface LoginScreenProps {
  onSuccess: (user: AuthUser) => void
}

export function LoginScreen({ onSuccess }: LoginScreenProps) {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [selectedDemoId, setSelectedDemoId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function applyDemo(user: AuthUser) {
    setSelectedDemoId(user.id)
    setEmail(user.email)
    setPassword(user.password)
    setError(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!email.trim() || !password) {
      setError('Enter email/username and password to continue.')
      return
    }

    setLoading(true)
    const ok = await login(email, password, rememberMe)
    setLoading(false)

    if (!ok) {
      setError('Invalid credentials. Use a demo account below for client walkthrough.')
      return
    }

    const user =
      DEMO_USERS.find(
        (demo) => demo.email.toLowerCase() === email.trim().toLowerCase(),
      ) ?? null
    if (user) onSuccess(user)
  }

  return (
    <div className="min-h-screen bg-surface text-foreground lg:grid lg:grid-cols-2">
      {/* Left Hero Brand Panel */}
      <aside className="relative hidden overflow-hidden bg-[#060a10] lg:flex lg:flex-col lg:justify-between lg:p-10 xl:p-12">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(148,163,184,0.35) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.35) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_500px_at_20%_10%,rgba(14,116,144,0.35),transparent_55%),radial-gradient(700px_420px_at_90%_80%,rgba(245,158,11,0.18),transparent_50%)]" />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-3">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-400/40">
              <Fan className="h-6 w-6" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">
                Manufacturing Suite
              </p>
              <p className="text-sm text-slate-400">Quote & Production Tracking</p>
            </div>
          </div>

          <h1 className="mt-10 max-w-xl text-4xl font-semibold leading-tight tracking-tight text-slate-50 xl:text-5xl">
            Turbine Blade QMS & Production Control Center
          </h1>
          <p className="mt-4 max-w-lg text-base leading-relaxed text-slate-400">
            Industrial operations portal for post-win execution — batch release,
            machine capacity, shop-floor capture, handover, and dispatch.
          </p>

          <span className="mt-6 inline-flex items-center gap-2 rounded-full bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-300 ring-1 ring-cyan-400/35">
            <ShieldCheck className="h-3.5 w-3.5" />
            v1.1 Enterprise Edition
          </span>
        </div>

        <div className="relative z-10 space-y-3">
          <div className="flex flex-wrap gap-2">
            {[
              'Real-Time Shop Floor Tracking',
              'Shift-Wise Machine Planning',
              'Serial Traceability',
              'Executive Efficiency Analytics',
            ].map((chip) => (
              <span
                key={chip}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200"
              >
                <Gauge className="h-3.5 w-3.5 text-amber-400" />
                {chip}
              </span>
            ))}
          </div>
          <p className="text-xs text-slate-500">
            Secure access for Production Managers, Operators, Supervisors & Admins
          </p>
        </div>
      </aside>

      {/* Right Login Form Panel */}
      <section className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-6 text-center lg:hidden">
            <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/15 text-accent ring-1 ring-accent/30">
              <Fan className="h-6 w-6" />
            </div>
            <h1 className="mt-3 text-xl font-semibold text-foreground">
              Turbine Blade QMS
            </h1>
            <p className="text-sm text-muted">Production Control Center</p>
          </div>

          <div className="rounded-3xl border border-border bg-surface-raised p-6 shadow-[0_0_0_1px_rgba(14,116,144,0.08),0_20px_50px_-24px_rgba(14,116,144,0.45)] sm:p-8">
            <div className="mb-6 flex items-start gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-surface-muted text-accent ring-1 ring-border">
                <Factory className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-foreground">
                  Sign In to Operational Portal
                </h2>
                <p className="mt-1 text-sm text-muted">
                  Authenticate to access production execution modules
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block space-y-1.5">
                <span className="text-xs font-medium uppercase tracking-wider text-muted">
                  Email / Username
                </span>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <input
                    type="email"
                    autoComplete="username"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@manufacturing.com"
                    className="w-full rounded-xl border border-border bg-surface-muted py-3 pl-10 pr-3 text-sm text-foreground outline-none ring-accent/30 transition focus:ring-2"
                  />
                </div>
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs font-medium uppercase tracking-wider text-muted">
                  Password
                </span>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter password"
                    className="w-full rounded-xl border border-border bg-surface-muted py-3 pl-10 pr-11 text-sm text-foreground outline-none ring-accent/30 transition focus:ring-2"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted transition hover:bg-surface hover:text-foreground"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </label>

              <div className="flex items-center justify-between gap-3 text-sm">
                <label className="inline-flex items-center gap-2 text-muted">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) => setRememberMe(event.target.checked)}
                    className="h-4 w-4 rounded border-border accent-cyan-600"
                  />
                  Remember Me
                </label>
                <button
                  type="button"
                  className="font-medium text-accent transition hover:underline"
                  onClick={() =>
                    setError('Password reset is mocked for this prototype demo.')
                  }
                >
                  Forgot Password?
                </button>
              </div>

              {error ? (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-sm text-danger">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70 dark:text-slate-950"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Authenticating…
                  </>
                ) : (
                  'Sign In to Production Center'
                )}
              </button>
            </form>

            <div className="mt-6 border-t border-border pt-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                Demo Account Quick Select
              </p>
              <p className="mt-1 text-xs text-muted">
                Prefill credentials for client presentation roles
              </p>

              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {DEMO_USERS.map((user) => {
                  const active = selectedDemoId === user.id
                  return (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => applyDemo(user)}
                      className={`rounded-xl border px-3 py-2.5 text-left transition ${
                        active
                          ? 'border-accent/50 bg-accent/10 ring-1 ring-accent/30'
                          : 'border-border bg-surface-muted hover:border-accent/30'
                      }`}
                    >
                      <p className="text-sm font-semibold text-foreground">
                        {user.role}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] text-muted">
                        {user.email}
                      </p>
                      <p className="mt-1 text-[11px] leading-snug text-sidebar-muted dark:text-slate-400">
                        {user.accessSummary}
                      </p>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <p className="mt-5 text-center text-xs text-muted">
            Prototype authentication · no live SSO connected
          </p>
        </div>
      </section>
    </div>
  )
}
