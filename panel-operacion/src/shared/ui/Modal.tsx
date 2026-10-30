import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useId, type ReactNode } from 'react'
import { EASE_OUT_QUART } from '../lib/motion'

type Props = {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}

export function Modal({ open, title, onClose, children }: Props) {
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

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <motion.div
            className="absolute inset-0 bg-stone-900/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1, transition: { duration: 0.22, ease: EASE_OUT_QUART } }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
          >
            <h2 id={titleId} className="text-lg font-semibold text-stone-900">
              {title}
            </h2>
            <div className="mt-4">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
