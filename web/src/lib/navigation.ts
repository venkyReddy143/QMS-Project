import type { LucideIcon } from 'lucide-react'
import {
  ClipboardList,
  Cog,
  Factory,
  LayoutDashboard,
  ListChecks,
  PlusCircle,
  Users,
} from 'lucide-react'
import type { UserRole } from '../types/auth'

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
    id: 'dashboard',
    label: 'Dashboard',
    path: '/dashboard',
    description: 'Super Admin overview of users, masters, and orders',
    icon: LayoutDashboard,
    roles: ['Super Admin'],
  },
  {
    id: 'admin-users',
    label: 'Users',
    path: '/admin/users',
    description: 'Create users and assign roles',
    icon: Users,
    roles: ['Super Admin'],
  },
  {
    id: 'admin-masters',
    label: 'Masters',
    path: '/admin/masters',
    description: 'Manage machines, products, process steps, and customers',
    icon: Cog,
    roles: ['Super Admin'],
  },
  {
    id: 'orders',
    label: 'Orders',
    path: '/orders',
    description: 'View and track production orders',
    icon: ClipboardList,
    roles: ['Order Creator', 'Production Manager', 'Floor Manager', 'Super Admin'],
  },
  {
    id: 'create-order',
    label: 'Create New Order',
    path: '/create-order',
    description: 'Create a new manufacturing order inquiry',
    icon: PlusCircle,
    roles: ['Order Creator', 'Super Admin'],
  },
  {
    id: 'production-planning',
    label: 'Shift Work Update',
    path: '/production-planning',
    description: 'Log serial progress by shift across shared batches',
    icon: Factory,
    roles: ['Production Manager', 'Floor Manager', 'Super Admin'],
  },
  {
    id: 'my-tasks',
    label: 'Manager Reviews',
    path: '/my-tasks',
    description: 'Resolve progress disputes — Floor Manager final decision',
    icon: ListChecks,
    roles: ['Production Manager', 'Floor Manager', 'Super Admin'],
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
