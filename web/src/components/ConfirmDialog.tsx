import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle } from 'lucide-react'

export type ConfirmOptions = {
  /** Heading, e.g. "Delete product". */
  title?: string
  /** Body text. A string or any React node (use it to highlight the item name). */
  message: ReactNode
  /** Label of the confirm button. Default: "Delete". */
  confirmLabel?: string
  /** Label of the cancel button. Default: "Cancel". */
  cancelLabel?: string
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<ConfirmFn | null>(null)

type PendingState = ConfirmOptions & { resolve: (value: boolean) => void }

/**
 * Mount once near the root. Any component can then call
 * `const confirm = useConfirm()` and `if (!(await confirm({...}))) return`.
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingState | null>(null)
  const pendingRef = useRef<PendingState | null>(null)
  pendingRef.current = pending

  const confirm = useCallback<ConfirmFn>((options) => {
    return new Promise<boolean>((resolve) => {
      // If a dialog is somehow already open, cancel it before showing the new one.
      pendingRef.current?.resolve(false)
      setPending({ ...options, resolve })
    })
  }, [])

  const close = useCallback((result: boolean) => {
    const current = pendingRef.current
    if (!current) return
    current.resolve(result)
    setPending(null)
  }, [])

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {pending ? <ConfirmModal options={pending} onClose={close} /> : null}
    </ConfirmContext.Provider>
  )
}

export function useConfirm(): ConfirmFn {
  const confirm = useContext(ConfirmContext)
  if (!confirm) {
    throw new Error('useConfirm must be used inside <ConfirmProvider>.')
  }
  return confirm
}

function ConfirmModal({
  options,
  onClose,
}: {
  options: ConfirmOptions
  onClose: (result: boolean) => void
}) {
  const cancelRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    // Focus Cancel by default so a stray Enter key never deletes anything.
    cancelRef.current?.focus()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose(false)
      }
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => {
      window.removeEventListener('keydown', onKeyDown, true)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose])

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose(false)
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
        className="w-full max-w-md rounded-3xl border border-border bg-surface-raised p-6 shadow-2xl"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-danger">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h3 id="confirm-dialog-title" className="text-lg font-bold text-foreground">
            {options.title ?? 'Confirm delete'}
          </h3>
        </div>

        <div id="confirm-dialog-message" className="mt-3 text-sm text-muted">
          {options.message}
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            ref={cancelRef}
            type="button"
            onClick={() => onClose(false)}
            className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-surface-muted"
          >
            {options.cancelLabel ?? 'Cancel'}
          </button>
          <button
            type="button"
            onClick={() => onClose(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-danger px-5 py-2 text-sm font-bold text-white hover:bg-danger/90"
          >
            {options.confirmLabel ?? 'Delete'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
