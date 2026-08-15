import type { LucideIcon } from 'lucide-react'
import {
  ClipboardList,
  Factory,
  ListChecks,
  PlusCircle,
} from 'lucide-react'
import type { UserRole } from '../context/AuthContext'

export interface NavItem {
  id: string
  label: string
  path: string
  description: string
  icon: LucideIcon
  roles: UserRole[]
}

export const navItems: NavItem[] = [
  {
    id: 'create-order',
    label: 'Create Order',
    path: '/create-order',
    description: 'Create a new manufacturing order inquiry',
    icon: PlusCircle,
    roles: ['Order Creator'],
  },
  {
    id: 'orders',
    label: 'Orders List',
    path: '/orders',
    description: 'View and track production orders',
    icon: ClipboardList,
    roles: ['Production Manager', 'Floor Manager'],
  },
  {
    id: 'production-planning',
    label: 'Shift Work Update',
    path: '/production-planning',
    description: 'Log serial progress by shift across shared batches',
    icon: Factory,
    roles: ['Production Manager', 'Floor Manager'],
  },
  {
    id: 'my-tasks',
    label: 'Manager Reviews',
    path: '/my-tasks',
    description: 'Resolve progress disputes — Floor Manager final decision',
    icon: ListChecks,
    roles: ['Production Manager', 'Floor Manager'],
  },
]

export function getNavForRole(role: UserRole | null | undefined): NavItem[] {
  if (!role) return []
  return navItems.filter((item) => item.roles.includes(role))
}

export function getNavItemByPath(pathname: string): NavItem | undefined {
  return navItems.find(
    (item) => pathname === item.path || pathname.startsWith(`${item.path}/`),
  )
}
