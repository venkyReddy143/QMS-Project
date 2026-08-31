import type { LucideIcon } from 'lucide-react'
import {
  ClipboardList,
  Cog,
  Factory,
  LayoutDashboard,
  ListChecks,
  PlusCircle,
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

export interface SuperAdminNavLink {
  id: string
  label: string
  path: string
}

export interface SuperAdminNavGroup {
  id: string
  label: string
  icon: LucideIcon
  children: Array<SuperAdminNavGroup | SuperAdminNavLink>
}

export type SuperAdminNavNode = SuperAdminNavGroup | (SuperAdminNavLink & { icon: LucideIcon })

export function isSuperAdminNavGroup(
  node: SuperAdminNavGroup | SuperAdminNavLink,
): node is SuperAdminNavGroup {
  return 'children' in node
}

export const navItems: NavItem[] = [
  {
    id: 'orders',
    label: 'Orders',
    path: '/orders',
    description: 'View and track production orders',
    icon: ClipboardList,
    roles: ['Order Creator', 'Production Manager', 'Floor Manager'],
  },
  {
    id: 'create-order',
    label: 'Create New Order',
    path: '/create-order',
    description: 'Create a new manufacturing order inquiry',
    icon: PlusCircle,
    roles: ['Order Creator'],
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

export const superAdminNav: SuperAdminNavNode[] = [
  {
    id: 'order',
    label: 'Order',
    icon: ClipboardList,
    children: [
      {
        id: 'my-orders',
        label: 'My Orders',
        icon: ClipboardList,
        children: [
          { id: 'my-orders-active', label: 'Active Orders', path: '/order/my-orders/active' },
          { id: 'my-orders-all', label: 'All Orders', path: '/order/my-orders/all' },
        ],
      },
      {
        id: 'all-orders',
        label: 'Orders',
        icon: ClipboardList,
        children: [
          { id: 'orders-active', label: 'Active Orders', path: '/order/orders/active' },
          { id: 'orders-all', label: 'All Orders', path: '/order/orders/all' },
        ],
      },
    ],
  },
  {
    id: 'production',
    label: 'Production',
    icon: Factory,
    children: [
      {
        id: 'my-production',
        label: 'My Production',
        icon: Factory,
        children: [
          { id: 'prod-active', label: 'Active', path: '/production/my-production/active' },
          { id: 'prod-closed', label: 'Closed', path: '/production/my-production/closed' },
          { id: 'prod-new', label: 'New', path: '/production/my-production/new' },
          { id: 'prod-all', label: 'All', path: '/production/my-production/all' },
        ],
      },
    ],
  },
  {
    id: 'masters',
    label: 'Masters',
    icon: Cog,
    children: [
      { id: 'masters-products', label: 'Products', path: '/masters/products' },
      { id: 'masters-machine-types', label: 'Machine type', path: '/masters/machine-types' },
      { id: 'masters-machines', label: 'Machines', path: '/masters/machines' },
      { id: 'masters-calendars', label: 'Calenders', path: '/masters/calendars' },
      { id: 'masters-workers', label: 'Workers', path: '/masters/workers' },
    ],
  },
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    id: 'create-order',
    label: 'Create New Order',
    path: '/create-order',
    icon: PlusCircle,
  },
  {
    id: 'production-planning',
    label: 'Shift Work Update',
    path: '/production-planning',
    icon: Factory,
  },
  {
    id: 'my-tasks',
    label: 'Manager Reviews',
    path: '/my-tasks',
    icon: ListChecks,
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

export function superAdminNavContainsPath(
  node: SuperAdminNavGroup | SuperAdminNavLink,
  pathname: string,
): boolean {
  if (!isSuperAdminNavGroup(node)) {
    return pathname === node.path || pathname.startsWith(`${node.path}/`)
  }
  return node.children.some((child) => superAdminNavContainsPath(child, pathname))
}
