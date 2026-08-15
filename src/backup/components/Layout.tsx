import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { getNavItemByPath } from '../../lib/navigation'

type ThemeMode = 'light' | 'dark'

function getInitialTheme(): ThemeMode {
  const stored = localStorage.getItem('qms-theme')
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

export function Layout() {
  const location = useLocation()
  const currentNav = getNavItemByPath(location.pathname)
  const [collapsed, setCollapsed] = useState(false)
  const [theme, setTheme] = useState<ThemeMode>(() => getInitialTheme())

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('qms-theme', theme)
  }, [theme])

  return (
    <div className="flex min-h-screen bg-surface text-foreground">
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((value) => !value)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          currentNav={currentNav}
          theme={theme}
          onToggleTheme={() =>
            setTheme((current) => (current === 'dark' ? 'light' : 'dark'))
          }
        />
        <main className="flex-1 px-5 py-5">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
