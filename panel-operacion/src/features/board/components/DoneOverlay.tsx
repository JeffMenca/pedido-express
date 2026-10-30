import { motion } from 'framer-motion'
import { EASE_OUT_QUART } from '../../../shared/lib/motion'

/** Brief albahaca confirmation drawn over a ticket whose action just succeeded. */
export function DoneOverlay() {
  return (
    <motion.div
      role="status"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.14 }}
      className="absolute inset-0 grid place-items-center bg-ticket/85"
    >
      <motion.svg
        viewBox="0 0 56 56"
        className="size-14"
        initial={{ scale: 0.6 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 520, damping: 26 }}
        aria-hidden="true"
      >
        <circle cx="28" cy="28" r="28" className="fill-albahaca" />
        <motion.path
          d="M17 29.5l7.5 7.5L39.5 21"
          fill="none"
          stroke="white"
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.24, ease: EASE_OUT_QUART, delay: 0.08 }}
        />
      </motion.svg>
      <span className="sr-only">Hecho</span>
    </motion.div>
  )
}
