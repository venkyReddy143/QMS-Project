import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { ChevronDown, Factory, type LucideIcon } from 'lucide-react'
import {
  getNavForRole,
  isSuperAdminNavGroup,
  superAdminNav,
  superAdminNavContainsPath,
  type SuperAdminNavGroup,
  type SuperAdminNavLink,
  type SuperAdminNavNode,
} from '../../lib/navigation'
import { useAuth } from '../../context/AuthContext'

export function Sidebar() {
  const { user } = useAuth()

  if (user?.role === 'Super Admin') {
    return <SuperAdminSidebar />
  }

  const items = getNavForRole(user?.role)

  return (
    <aside className="flex w-[240px] shrink-0 flex-col border-r border-border bg-sidebar text-sidebar-text">
      <Brand />
      <nav className="flex-1 space-y-2 overflow-y-auto p-3">
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

function Brand() {
  return (
    <div className="flex items-center gap-3 border-b border-white/10 px-4 py-4">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
        <Factory className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-bold">Manufacturing</p>
        <p className="truncate text-xs text-sidebar-muted">Tracker</p>
      </div>
    </div>
  )
}

function SuperAdminSidebar() {
  const location = useLocation()
  const [open, setOpen] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const next: Record<string, boolean> = {}
    function walk(nodes: Array<SuperAdminNavGroup | SuperAdminNavLink>) {
      for (const node of nodes) {
        if (!isSuperAdminNavGroup(node)) continue
        if (superAdminNavContainsPath(node, location.pathname)) {
          next[node.id] = true
        }
        walk(node.children)
      }
    }
    walk(superAdminNav.filter((node) => isSuperAdminNavGroup(node)))
    setOpen((current) => ({ ...current, ...next }))
  }, [location.pathname])

  function toggle(id: string) {
    setOpen((current) => ({ ...current, [id]: !current[id] }))
  }

  return (
    <aside className="flex w-[240px] shrink-0 flex-col border-r border-border bg-sidebar text-sidebar-text">
      <Brand />
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {superAdminNav.map((node) => (
          <SuperAdminNode
            key={node.id}
            node={node}
            depth={0}
            open={open}
            onToggle={toggle}
          />
        ))}
      </nav>
    </aside>
  )
}

function SuperAdminNode({
  node,
  depth,
  open,
  onToggle,
}: {
  node: SuperAdminNavNode | SuperAdminNavGroup | SuperAdminNavLink
  depth: number
  open: Record<string, boolean>
  onToggle: (id: string) => void
}) {
  if (!isSuperAdminNavGroup(node)) {
    return <LeafLink item={node} depth={depth} icon={'icon' in node ? node.icon : undefined} />
  }

  const expanded = Boolean(open[node.id])
  const Icon = 'icon' in node ? node.icon : undefined
  const pad = depth === 0 ? 'px-3' : depth === 1 ? 'pl-5 pr-2' : 'pl-7 pr-2'

  return (
    <div>
      <button
        type="button"
        onClick={() => onToggle(node.id)}
        className={`flex min-h-11 w-full items-center gap-2 rounded-xl text-left text-sm font-semibold transition hover:bg-sidebar-hover ${pad}`}
      >
        {Icon && depth === 0 ? <Icon className="h-4 w-4 shrink-0" /> : null}
        <span className="min-w-0 flex-1 truncate">{node.label}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 transition ${expanded ? '' : '-rotate-90'}`}
        />
      </button>
      {expanded ? (
        <div className="mb-1 space-y-0.5">
          {node.children.map((child) => (
            <SuperAdminNode
              key={child.id}
              node={child}
              depth={depth + 1}
              open={open}
              onToggle={onToggle}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

function LeafLink({
  item,
  depth,
  icon: Icon,
}: {
  item: SuperAdminNavLink
  depth: number
  icon?: LucideIcon
}) {
  const pad =
    depth === 0 ? 'px-3' : depth === 1 ? 'pl-5 pr-2' : depth === 2 ? 'pl-8 pr-2' : 'pl-10 pr-2'

  return (
    <NavLink
      to={item.path}
      end
      className={({ isActive }) =>
        [
          'flex min-h-10 items-center gap-2 rounded-xl text-sm font-semibold transition',
          pad,
          isActive
            ? 'bg-sidebar-active text-white'
            : 'text-sidebar-text hover:bg-sidebar-hover',
        ].join(' ')
      }
    >
      {Icon && depth === 0 ? <Icon className="h-4 w-4 shrink-0" /> : null}
      <span className="truncate">{item.label}</span>
    </NavLink>
  )
}
