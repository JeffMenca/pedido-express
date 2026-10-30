import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useId, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { EASE_OUT_QUART } from '../lib/motion'

type Props = {
  open: boolean
  title: string
  eyebrow?: string
  onClose: () => void
  children: ReactNode
}

export function Modal({ open, title, eyebrow, onClose, children }: Props) {
  const titleId = useId()
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Portaled so ancestors with filter/mask (the tickets) cannot trap the fixed overlay.
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <motion.div
            className="absolute inset-0 bg-ink/55"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative w-full max-w-md [filter:drop-shadow(0_24px_48px_rgb(27_26_34/0.35))]"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1, transition: { duration: 0.22, ease: EASE_OUT_QUART } }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
          >
            <div className="ticket-perforated rounded-b-ticket bg-ticket px-6 pt-7 pb-6">
              {eyebrow && <p className="font-mono text-xs font-semibold text-humo">{eyebrow}</p>}
              <h2 id={titleId} className="mt-1 font-display text-xl font-bold tracking-tight text-ink">
                {title}
              </h2>
              <div className="mt-5">{children}</div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
