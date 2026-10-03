import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle2, X } from 'lucide-react'

/** How long a success toast stays on screen before it disappears on its own. */
export const TOAST_DURATION_MS = 10_000

const MAX_VISIBLE_TOASTS = 4

type ToastItem = { id: number; message: string }

type ToastApi = {
  /** Show a green success toast. Empty / missing messages are ignored. */
  success: (message: string | null | undefined) => void
  /** Remove every toast immediately. */
  clear: () => void
}

const ToastContext = createContext<ToastApi | null>(null)

/**
 * Mount once near the root. Any component can then call
 * `const toast = useToast()` and `toast.success('Saved.')`.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const nextId = useRef(1)

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((item) => item.id !== id))
  }, [])

  const success = useCallback((message: string | null | undefined) => {
    const text = message?.trim()
    if (!text) return
    const id = nextId.current++
    setToasts((current) =>
      // Showing the same text again replaces the old toast (and restarts its timer).
      [...current.filter((item) => item.message !== text), { id, message: text }].slice(
        -MAX_VISIBLE_TOASTS,
      ),
    )
  }, [])

  const clear = useCallback(() => setToasts([]), [])

  const api = useMemo<ToastApi>(() => ({ success, clear }), [success, clear])

  return (
    <ToastContext.Provider value={api}>
      {children}
      {createPortal(
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed right-4 top-4 z-[120] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-3"
        >
          {toasts.map((item) => (
            <ToastCard key={item.id} item={item} onDismiss={dismiss} />
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  )
}

export function useToast(): ToastApi {
  const api = useContext(ToastContext)
  if (!api) {
    throw new Error('useToast must be used inside <ToastProvider>.')
  }
  return api
}

function ToastCard({
  item,
  onDismiss,
}: {
  item: ToastItem
  onDismiss: (id: number) => void
}) {
  const [shrinking, setShrinking] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => onDismiss(item.id), TOAST_DURATION_MS)
    // Start the progress bar on the next frame so the CSS transition runs.
    const frame = window.requestAnimationFrame(() => setShrinking(true))
    return () => {
      window.clearTimeout(timer)
      window.cancelAnimationFrame(frame)
    }
  }, [item.id, onDismiss])

  return (
    <div className="pointer-events-auto overflow-hidden rounded-xl border border-emerald-500/30 bg-emerald-50 text-emerald-900 shadow-lg">
      <div className="flex items-start gap-3 px-4 py-3">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
        <p className="min-w-0 flex-1 break-words text-sm font-semibold">{item.message}</p>
        <button
          type="button"
          onClick={() => onDismiss(item.id)}
          aria-label="Dismiss message"
          className="shrink-0 rounded-md p-0.5 text-emerald-700 hover:bg-emerald-100"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="h-1 w-full bg-emerald-100">
        <div
          className="h-full bg-emerald-500"
          style={{
            width: shrinking ? '0%' : '100%',
            transition: `width ${TOAST_DURATION_MS}ms linear`,
          }}
        />
      </div>
    </div>
  )
}
