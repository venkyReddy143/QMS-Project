import { ChevronRight, Home } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { NavItem } from '../../lib/navigation'

interface BreadcrumbProps {
  current?: NavItem
}

export function Breadcrumb({ current }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm">
      <Link
        to="/batch-scheduling"
        className="inline-flex items-center gap-1 text-muted transition hover:text-accent"
      >
        <Home className="h-3.5 w-3.5" />
        <span>Execution</span>
      </Link>
      <ChevronRight className="h-3.5 w-3.5 text-muted/70" />
      <span className="font-medium text-foreground">
        {current?.label ?? 'Workspace'}
      </span>
    </nav>
  )
}
