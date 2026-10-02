import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { MoreVertical } from 'lucide-react'

export type RowAction = {
  label: string
  onClick: () => void
  danger?: boolean
}

const MENU_WIDTH = 176
const ITEM_HEIGHT = 40

/** Three-dot button that opens a small action menu (same look as My Production). */
export function RowActionsMenu({
  actions,
  label,
}: {
  actions: RowAction[]
  label: string
}) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const buttonRef = useRef<HTMLButtonElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const open = pos !== null

  function computePos() {
    const button = buttonRef.current
    if (!button) return null
    const rect = button.getBoundingClientRect()
    const menuHeight = actions.length * ITEM_HEIGHT + 12
    const left = Math.min(rect.left, Math.max(8, window.innerWidth - MENU_WIDTH - 8))
    const openUp = rect.bottom + menuHeight + 8 > window.innerHeight
    const top = openUp ? Math.max(8, rect.top - menuHeight - 4) : rect.bottom + 4
    return { top, left }
  }

  useEffect(() => {
    if (!open) return
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node
      if (menuRef.current?.contains(target)) return
      if (buttonRef.current?.contains(target)) return
      setPos(null)
    }
    function handleReposition() {
      setPos(computePos())
    }
    document.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('resize', handleReposition)
    window.addEventListener('scroll', handleReposition, true)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('resize', handleReposition)
      window.removeEventListener('scroll', handleReposition, true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, actions.length])

  return (
    <>
      <button
        type="button"
        ref={buttonRef}
        onClick={() => setPos(open ? null : computePos())}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface-muted text-foreground hover:border-accent hover:text-accent"
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {pos
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              style={{ top: pos.top, left: pos.left }}
              className="fixed z-[100] min-w-[11rem] overflow-hidden rounded-xl border border-border bg-surface-raised py-1 shadow-lg"
            >
              {actions.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  role="menuitem"
                  className={`block w-full px-3 py-2 text-left text-sm font-semibold hover:bg-surface-muted ${
                    action.danger ? 'text-danger' : ''
                  }`}
                  onClick={() => {
                    setPos(null)
                    action.onClick()
                  }}
                >
                  {action.label}
                </button>
              ))}
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
