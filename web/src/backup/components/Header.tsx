import { Bell, LogOut, Moon, Search, Sun } from 'lucide-react'
import { Breadcrumb } from './Breadcrumb'
import type { NavItem } from '../../lib/navigation'
import { activeProductionOrder } from '../../data/mockData'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'

interface HeaderProps {
  currentNav?: NavItem
  theme: 'light' | 'dark'
  onToggleTheme: () => void
}

export function Header({ currentNav, theme, onToggleTheme }: HeaderProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleSignOut() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-surface-raised/85 backdrop-blur-md">
      <div className="flex flex-col gap-3 px-5 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 space-y-1">
          <Breadcrumb current={currentNav} />
          <div>
            <h1 className="truncate text-lg font-semibold tracking-tight text-foreground">
              {currentNav?.label ?? 'Production Execution'}
            </h1>
            <p className="truncate text-sm text-muted">
              {currentNav?.description ??
                'Post-win production control for turbine blade manufacturing'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="hidden items-center gap-2 rounded-xl border border-border bg-surface-muted px-3 py-2 text-sm text-muted md:flex">
            <Search className="h-4 w-4" />
            <span>Search orders, batches, serials…</span>
          </div>

          <div className="rounded-xl border border-border bg-surface-muted px-3 py-2 text-xs">
            <span className="font-semibold text-accent">
              {activeProductionOrder.orderNumber}
            </span>
            <span className="mx-2 text-border">|</span>
            <span className="text-muted">
              {activeProductionOrder.partDescription}
            </span>
          </div>

          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface-muted text-muted transition hover:text-foreground"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={onToggleTheme}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-surface-muted px-3 text-sm text-muted transition hover:text-foreground"
            aria-label="Toggle color theme"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="h-4 w-4 text-industrial" />
                <span className="hidden sm:inline">Light</span>
              </>
            ) : (
              <>
                <Moon className="h-4 w-4 text-accent" />
                <span className="hidden sm:inline">Dark</span>
              </>
            )}
          </button>

          {user ? (
            <div className="flex items-center gap-2 rounded-xl border border-border bg-surface-muted py-1.5 pl-1.5 pr-2">
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="h-8 w-8 rounded-full object-cover ring-1 ring-accent/30"
              />
              <div className="hidden min-w-0 sm:block">
                <p className="truncate text-xs font-semibold text-foreground">
                  {user.name}
                </p>
                <p className="truncate text-[10px] font-medium text-accent">
                  {user.role}
                </p>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface-raised px-2 text-xs font-semibold text-muted transition hover:text-danger"
                title="Sign Out"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Sign Out</span>
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  )
}
