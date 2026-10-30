import { AnimatePresence, motion } from 'framer-motion'
import type { OrderSummary, Role } from '../../../shared/http/contract'
import { sceneUrl } from '../../../shared/lib/illustrations'
import { EASE_OUT_QUART } from '../../../shared/lib/motion'
import { Divider } from '../../../shared/ui/Divider'
import { Skeleton } from '../../../shared/ui/Skeleton'
import type { ViewDef } from '../hooks/views'
import { OrderTicket } from './OrderTicket'

type Props = {
  orders: OrderSummary[] | undefined
  role: Role
  now: number
  empty: ViewDef['empty']
}

const GRID = 'grid items-start gap-x-5 gap-y-6 [grid-template-columns:repeat(auto-fill,minmax(min(100%,272px),1fr))]'
const SKELETON_ROWS = [2, 3, 2, 3]

function TicketSkeleton({ rows }: { rows: number }) {
  return (
    <div className="ticket-perforated relative rounded-b-ticket bg-ticket pt-6 pr-4 pb-4 pl-6">
      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1 bg-ink/[0.08]" />
      <div className="flex items-start justify-between">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="mt-1 h-4 w-11" />
      </div>
      <Skeleton className="mt-3 h-3 w-28" />
      <Divider className="mt-4" />
      <div className="mt-3 space-y-2.5">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="size-9 shrink-0 rounded-control" />
            <Skeleton className="h-4 w-5 shrink-0" />
            <Skeleton className={`h-4 ${i % 2 === 0 ? 'w-3/5' : 'w-2/5'}`} />
          </div>
        ))}
      </div>
      <Divider className="mt-4" />
      <div className="mt-3 flex items-baseline justify-between">
        <Skeleton className="h-3 w-10" />
        <Skeleton className="h-6 w-24" />
      </div>
      <Skeleton className="mt-4 h-11 w-full rounded-control" />
    </div>
  )
}

function EmptyRail({ empty }: { empty: ViewDef['empty'] }) {
  const scene = sceneUrl(empty.scene)
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: EASE_OUT_QUART, delay: 0.3 }}
      className="mx-auto flex max-w-md flex-col items-center px-6 pt-14 pb-10 text-center"
    >
      {scene && (
        <img
          src={scene}
          alt=""
          aria-hidden="true"
          draggable={false}
          className="h-auto w-[280px] max-w-full opacity-70 saturate-[0.65]"
        />
      )}
      <p className="mt-6 font-display text-xl font-bold tracking-tight text-ink">{empty.title}</p>
      <p className="mt-2 text-base text-humo">{empty.next}</p>
    </motion.div>
  )
}

/** Tickets hang from a thin mostaza rail, like comandas clipped above the pass. */
export function TicketRail({ orders, role, now, empty }: Props) {
  return (
    <div className="mt-6">
      <div aria-hidden="true" className="h-[3px] rounded-full bg-mostaza" />
      {orders === undefined ? (
        <div className={GRID} aria-busy="true" aria-label="Cargando órdenes">
          {SKELETON_ROWS.map((rows, i) => (
            <TicketSkeleton key={i} rows={rows} />
          ))}
        </div>
      ) : (
        <>
          <ul className={GRID}>
            <AnimatePresence mode="popLayout">
              {orders.map((order, index) => (
                <OrderTicket key={order.id} order={order} role={role} now={now} index={index} />
              ))}
            </AnimatePresence>
          </ul>
          {orders.length === 0 && <EmptyRail empty={empty} />}
        </>
      )}
    </div>
  )
}
