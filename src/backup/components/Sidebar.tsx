import { NavLink } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Fan } from 'lucide-react'
import { navItems } from '../../lib/navigation'
import { useAuth } from '../../context/AuthContext'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { user, canAccess } = useAuth()
  const visibleNav = navItems.filter((item) => canAccess(item.path))

  return (
    <aside
      className={`sticky top-0 flex h-screen shrink-0 flex-col border-r border-border bg-sidebar text-sidebar-text transition-[width] duration-200 ${
        collapsed ? 'w-[76px]' : 'w-[288px]'
      }`}
    >
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/20 text-accent ring-1 ring-accent/40">
          <Fan className="h-5 w-5" />
        </div>
        {!collapsed ? (
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold uppercase tracking-[0.18em] text-industrial">
              QMS Execution
            </p>
            <p className="truncate text-sm text-sidebar-muted">
              Turbine Blade MES
            </p>
          </div>
        ) : null}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-3">
        {visibleNav.map((item, index) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.id}
              to={item.path}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                [
                  'flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors',
                  isActive
                    ? 'bg-sidebar-active text-white shadow-lg shadow-cyan-950/30'
                    : 'text-sidebar-text hover:bg-sidebar-hover',
                ].join(' ')
              }
            >
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 ring-1 ring-white/10">
                <Icon className="h-4 w-4" />
              </span>
              {!collapsed ? (
                <span className="min-w-0">
                  <span className="block text-[11px] font-medium uppercase tracking-wider text-sidebar-muted">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="block text-sm font-medium leading-snug">
                    {item.label}
                  </span>
                </span>
              ) : null}
            </NavLink>
          )
        })}
      </nav>

      <div className="space-y-2 border-t border-white/10 p-3">
        {user ? (
          <div
            className={`rounded-xl bg-white/5 ring-1 ring-white/10 ${
              collapsed ? 'flex justify-center p-2' : 'p-3'
            }`}
            title={collapsed ? `${user.name} · ${user.role}` : undefined}
          >
            <div className={`flex ${collapsed ? '' : 'items-start gap-3'}`}>
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="h-10 w-10 shrink-0 rounded-full bg-sidebar-hover object-cover ring-2 ring-accent/40"
              />
              {!collapsed ? (
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-sidebar-text">
                    {user.name}
                  </p>
                  <p className="truncate text-xs text-accent">{user.role}</p>
                  <p className="mt-1 truncate text-[11px] text-sidebar-muted">
                    {user.email}
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        <button
          type="button"
          onClick={onToggle}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-sm text-sidebar-muted transition hover:bg-white/10 hover:text-sidebar-text"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}
