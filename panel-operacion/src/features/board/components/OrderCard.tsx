import { motion, useReducedMotion } from 'framer-motion'
import type { Channel, OrderSummary, Role } from '../../../shared/http/contract'
import { formatGTQ } from '../../../shared/lib/money'
import { LAYOUT_SPRING } from '../../../shared/lib/motion'
import { elapsedMinutes, formatElapsed } from '../../../shared/lib/time'
import { OrderActions } from '../../orders'

const CHANNEL_LABEL: Record<Channel, string> = {
  MOSTRADOR: 'Mostrador',
  KIOSKO: 'Kiosko',
  AUTOSERVICIO: 'Autoservicio',
  DOMICILIO: 'Domicilio',
}

type Props = { order: OrderSummary; role: Role; accent: string; now: number; index: number }

function summarizeLines(order: OrderSummary): string {
  const lines = order.lines ?? []
  if (lines.length === 0) return 'Sin detalle de artículos'
  return lines.map((l) => `${l.quantity}× ${l.name}`).join(', ')
}

function elapsedTone(minutes: number): string {
  if (minutes >= 15) return 'text-red-700 font-semibold'
  if (minutes >= 10) return 'text-amber-600 font-semibold'
  return 'text-stone-500'
}

export function OrderCard({ order, role, accent, now, index }: Props) {
  const reduceMotion = useReducedMotion()
  const minutes = elapsedMinutes(order.createdAt, now)

  return (
    <motion.li
      layout={!reduceMotion}
      layoutId={reduceMotion ? undefined : order.id}
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
      transition={{
        layout: LAYOUT_SPRING,
        opacity: { duration: 0.22, delay: Math.min(index, 8) * 0.035 },
        y: { duration: 0.22, delay: Math.min(index, 8) * 0.035 },
      }}
      className="relative overflow-hidden rounded-xl border border-stone-200 bg-white p-4 pl-5"
    >
      <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-[3px] ${accent}`} />
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-semibold tabular-nums text-stone-900">{order.code}</span>
        <span className={`text-sm tabular-nums ${elapsedTone(minutes)}`} title="Tiempo desde que se creó la orden">
          {formatElapsed(order.createdAt, now)}
        </span>
      </div>
      <p className="mt-0.5 text-xs text-stone-500">
        {CHANNEL_LABEL[order.channel]} · {order.paymentMethod === 'EFECTIVO' ? 'Efectivo' : 'Tarjeta'}
      </p>
      <p className="mt-2 line-clamp-2 text-sm text-stone-700">{summarizeLines(order)}</p>
      <p className="mt-2 text-right text-base font-semibold tabular-nums text-stone-900">{formatGTQ(order.totalCents)}</p>
      <OrderActions order={order} role={role} />
    </motion.li>
  )
}
