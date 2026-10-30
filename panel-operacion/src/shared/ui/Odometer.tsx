import { AnimatePresence, motion, type Variants } from 'framer-motion'
import { useEffect, useRef } from 'react'

const digit: Variants = {
  enter: (dir: number) => ({ y: `${dir * 100}%`, opacity: 0 }),
  center: { y: '0%', opacity: 1 },
  exit: (dir: number) => ({ y: `${dir * -100}%`, opacity: 0 }),
}

type Props = { value: number; className?: string }

/** Rolls each digit vertically: up when the number grows, down when it shrinks. */
export function Odometer({ value, className = '' }: Props) {
  const previous = useRef(value)
  const dir = value < previous.current ? -1 : 1
  useEffect(() => {
    previous.current = value
  }, [value])

  const chars = String(value).split('')
  return (
    <span className={`inline-flex tabular-nums ${className}`}>
      <span className="sr-only">{value}</span>
      {chars.map((char, i) => (
        // Keyed from the right so the units slot stays the units slot when the length changes.
        <span key={chars.length - i} aria-hidden="true" className="relative inline-grid overflow-hidden">
          <AnimatePresence mode="popLayout" initial={false} custom={dir}>
            <motion.span
              key={char}
              custom={dir}
              variants={digit}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: 'spring', stiffness: 520, damping: 38 }}
              className="[grid-area:1/1]"
            >
              {char}
            </motion.span>
          </AnimatePresence>
        </span>
      ))}
    </span>
  )
}
