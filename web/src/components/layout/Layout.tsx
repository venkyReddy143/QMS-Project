import { useEffect, useRef } from 'react'
import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { Sidebar } from './Sidebar'

export function Layout() {
  const mainRef = useRef<HTMLElement | null>(null)


  useEffect(() => {
    const main = mainRef.current
    if (!main) return
    let frame = 0

    function measure() {
      frame = 0
      if (!main) return
      main.classList.remove('single-scroll')
      if (main.scrollHeight > main.clientHeight + 1) {
        main.classList.add('single-scroll')
      }
    }

    function schedule() {
      if (frame) return
      frame = requestAnimationFrame(measure)
    }

    schedule()
    window.addEventListener('resize', schedule)
    const resizeObserver = new ResizeObserver(schedule)
    resizeObserver.observe(main)
    const mutationObserver = new MutationObserver(schedule)
    mutationObserver.observe(main, { childList: true, subtree: true })

    return () => {
      if (frame) cancelAnimationFrame(frame)
      window.removeEventListener('resize', schedule)
      resizeObserver.disconnect()
      mutationObserver.disconnect()
    }
  }, [])

  return (
    <div className="flex h-screen overflow-hidden bg-surface text-foreground">
      <Sidebar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <Header />
        <main
          ref={mainRef}
          className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 sm:p-5"
        >
          <Outlet />
        </main>
      </div>
    </div>
  )
}
