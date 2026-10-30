import { motion } from 'framer-motion'
import { EASE_OUT_QUART } from '../../../shared/lib/motion'
import { formatClock, useMinuteClock } from '../../../shared/lib/time'
import { Odometer } from '../../../shared/ui/Odometer'
import { Skeleton } from '../../../shared/ui/Skeleton'

type Props = { title: string; hint: string; count: number | undefined }

function StationClock() {
  const now = useMinuteClock()
  return (
    <p className="text-right">
      <time
        dateTime={now.toISOString()}
        className="block font-mono text-[28px] leading-none font-medium tabular-nums text-ink/70"
      >
        {formatClock(now)}
      </time>
      <span className="mt-1 block text-xs text-humo">Hora</span>
    </p>
  )
}

export function ViewHeader({ title, hint, count }: Props) {
  return (
    <header className="flex items-end justify-between gap-6">
      <div className="min-w-0">
        <motion.h1
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.26, ease: EASE_OUT_QUART }}
          className="font-display text-[28px] leading-none font-extrabold tracking-tight text-ink sm:text-[40px]"
        >
          {title}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.26, ease: EASE_OUT_QUART, delay: 0.05 }}
          className="mt-3 text-base text-humo"
        >
          {hint}
        </motion.p>
      </div>
      <div className="flex shrink-0 items-end gap-5">
        <p className="text-right">
          <span className="flex h-7 justify-end font-mono text-[28px] leading-none font-bold text-ink">
            {count === undefined ? <Skeleton className="h-7 w-9" /> : <Odometer value={count} />}
          </span>
          <span className="mt-1 block text-xs text-humo">{count === 1 ? 'orden' : 'órdenes'}</span>
        </p>
        <span aria-hidden="true" className="hidden h-12 border-l border-dashed border-ink/20 sm:block" />
        <div className="hidden sm:block">
          <StationClock />
        </div>
      </div>
    </header>
  )
}
