import type { LucideIcon } from 'lucide-react'
import {
  CalendarClock,
  ClipboardList,
  Factory,
  Gauge,
  PackageCheck,
  Shuffle,
} from 'lucide-react'

export interface NavItem {
  id: string
  label: string
  path: string
  description: string
  icon: LucideIcon
}

export const navItems: NavItem[] = [
  {
    id: 'batch-scheduling',
    label: 'Delivery Batch Scheduling',
    path: '/batch-scheduling',
    description: 'Release and sequence delivery batches against order due dates',
    icon: CalendarClock,
  },
  {
    id: 'daily-progress',
    label: 'Daily Progress & Shop Floor Capture',
    path: '/daily-progress',
    description: 'Capture piece-level progress, scrap, and shop-floor actuals',
    icon: ClipboardList,
  },
  {
    id: 'capacity-planning',
    label: 'Machine Capacity & Shift Planning',
    path: '/capacity-planning',
    description: 'Balance machine load across shifts A / B / C',
    icon: Factory,
  },
  {
    id: 'shift-handover',
    label: 'Shift Handover & Deviation Log',
    path: '/shift-handover',
    description: 'Record deviations, blockers, and shift-to-shift context',
    icon: Shuffle,
  },
  {
    id: 'dispatch',
    label: 'Dispatch Console',
    path: '/dispatch',
    description: 'Authorize packing release and outbound dispatch',
    icon: PackageCheck,
  },
  {
    id: 'executive-dashboard',
    label: 'Executive Progress & Efficiency Dashboard',
    path: '/executive-dashboard',
    description: 'OEE, throughput, and delivery risk at a glance',
    icon: Gauge,
  },
]

export function getNavItemByPath(pathname: string): NavItem | undefined {
  return navItems.find(
    (item) => pathname === item.path || pathname.startsWith(`${item.path}/`),
  )
}
