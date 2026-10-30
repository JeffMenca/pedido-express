import { motion, useReducedMotion } from 'framer-motion'
import { forwardRef } from 'react'
import type { Channel, OrderStatus, OrderSummary, Role } from '../../../shared/http/contract'
import { formatGTQ } from '../../../shared/lib/money'
import { EASE_OUT_QUART, LAYOUT_SPRING } from '../../../shared/lib/motion'
import { elapsedMinutes, formatElapsed } from '../../../shared/lib/time'
import { Divider } from '../../../shared/ui/Divider'
import { Icon } from '../../../shared/ui/Icon'
import { OrderActions } from '../../orders'

const CHANNEL_LABEL: Record<Channel, string> = {
  MOSTRADOR: 'Mostrador',
  KIOSKO: 'Kiosko',
  AUTOSERVICIO: 'Autoservicio',
  DOMICILIO: 'Domicilio',
}

const STATUS_BAR: Partial<Record<OrderStatus, string>> = {
  PENDIENTE_PAGO: 'bg-mostaza',
  PAGADA: 'bg-albahaca',
  EN_PREPARACION: 'bg-salsa',
  LISTA: 'bg-albahaca',
}

function elapsedTone(minutes: number): string {
  if (minutes >= 15) return 'text-salsa font-bold'
  if (minutes >= 10) return 'text-demora font-bold'
  return 'text-humo'
}

type Props = { order: OrderSummary; role: Role; now: number; index: number }

export const OrderTicket = forwardRef<HTMLLIElement, Props>(function OrderTicket({ order, role, now, index }, ref) {
  const reduceMotion = useReducedMotion()
  const minutes = elapsedMinutes(order.createdAt, now)
  const delay = Math.min(index, 8) * 0.035
  const lines = order.lines ?? []

  return (
    <motion.li
      ref={ref}
      layout={reduceMotion ? false : 'position'}
      initial={reduceMotion ? { opacity: 0 } : { clipPath: 'inset(0% 0% 100% 0%)' }}
      animate={
        reduceMotion
          ? { opacity: 1 }
          : { clipPath: 'inset(0% 0% 0% 0%)', transitionEnd: { clipPath: 'none' } }
      }
      exit={
        reduceMotion
          ? { opacity: 0, transition: { duration: 0.15 } }
          : { x: 56, opacity: 0, transition: { duration: 0.16, ease: [0.5, 0, 0.75, 0] } }
      }
      transition={{ duration: 0.26, ease: EASE_OUT_QUART, delay, layout: LAYOUT_SPRING }}
      className="ticket-lift"
    >
      <article
        aria-label={`Orden ${order.code}`}
        className="ticket-perforated relative rounded-b-ticket bg-ticket pt-6 pr-4 pb-4 pl-6"
      >
        <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-1 ${STATUS_BAR[order.status] ?? 'bg-humo'}`} />

        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-2 font-mono text-[28px] leading-none font-bold tracking-tight text-ink">
              {order.code}
              {order.status === 'LISTA' && (
                <span className="grid size-6 place-items-center rounded-full bg-albahaca text-white">
                  <Icon name="check" className="size-4" strokeWidth={2.75} />
                  <span className="sr-only">Lista</span>
                </span>
              )}
            </p>
            <p className="mt-2 text-xs font-medium text-humo">
              {CHANNEL_LABEL[order.channel]} · {order.paymentMethod === 'EFECTIVO' ? 'Efectivo' : 'Tarjeta'}
            </p>
          </div>
          <time
            dateTime={order.createdAt}
            title="Tiempo desde que se creó la orden"
            className={`pt-1 font-mono text-sm tabular-nums ${elapsedTone(minutes)}`}
          >
            {formatElapsed(order.createdAt, now)}
          </time>
        </header>

        <Divider className="mt-4" />

        {lines.length === 0 ? (
          <p className="mt-3 text-sm text-humo">Sin detalle de artículos</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {lines.map((line, i) => (
              <li key={`${line.name}-${i}`}>
                <div className="flex gap-2">
                  <span className="w-8 shrink-0 font-mono font-bold tabular-nums">{line.quantity}×</span>
                  <span className="font-medium text-ink">{line.name}</span>
                </div>
                {(line.upgradeLarge || (line.modifiers?.length ?? 0) > 0) && (
                  <ul className="mt-0.5 space-y-0.5 pl-10 text-[13px] text-humo">
                    {line.upgradeLarge && <li>Agrandado</li>}
                    {line.modifiers?.map((m) => (
                      <li key={m}>+ {m}</li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}

        <Divider className="mt-4" />

        <div className="mt-3 flex items-baseline justify-between">
          <span className="text-xs font-semibold text-humo">Total</span>
          <span className="font-mono text-xl font-bold tabular-nums text-ink">{formatGTQ(order.totalCents)}</span>
        </div>

        <OrderActions order={order} role={role} />
      </article>
    </motion.li>
  )
})
