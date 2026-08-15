import { NavLink } from 'react-router-dom'
import { Factory } from 'lucide-react'
import { getNavForRole } from '../../lib/navigation'
import { useAuth } from '../../context/AuthContext'

export function Sidebar() {
  const { user } = useAuth()
  const items = getNavForRole(user?.role)

  return (
    <aside className="flex w-[240px] shrink-0 flex-col border-r border-border bg-sidebar text-sidebar-text">
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-4">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
          <Factory className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">Manufacturing</p>
          <p className="truncate text-xs text-sidebar-muted">Tracker</p>
        </div>
      </div>

      <nav className="flex-1 space-y-2 p-3">
        {items.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.id}
              to={item.path}
              className={({ isActive }) =>
                [
                  'flex min-h-12 items-center gap-3 rounded-xl px-3 text-base font-semibold transition',
                  isActive
                    ? 'bg-sidebar-active text-white'
                    : 'text-sidebar-text hover:bg-sidebar-hover',
                ].join(' ')
              }
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          )
        })}
      </nav>
    </aside>
  )
}
