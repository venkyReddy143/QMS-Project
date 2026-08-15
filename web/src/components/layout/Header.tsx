import { LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { formatPhoneDisplay, useAuth } from '../../context/AuthContext'

export function Header() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-surface-raised">
      <div className="flex min-h-16 flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
        <div>
          <p className="text-lg font-bold text-foreground">
            Manufacturing Order & Production Tracker
          </p>
          <p className="text-sm text-muted">Factory operations portal</p>
        </div>

        {user ? (
          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-xl border border-border bg-surface-muted px-3 py-2">
              <p className="text-sm font-bold text-foreground">{user.name}</p>
              <p className="text-xs text-muted">{formatPhoneDisplay(user.phone)}</p>
            </div>
            <span className="rounded-full bg-accent-soft px-3 py-1.5 text-sm font-bold text-accent">
              {user.role}
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-surface-muted px-4 text-sm font-bold text-foreground transition hover:border-danger hover:text-danger"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        ) : null}
      </div>
    </header>
  )
}
