import { AnimatePresence } from 'framer-motion'
import type { OrderSummary, Role } from '../../../shared/http/contract'
import { Divider } from '../../../shared/ui/Divider'
import { Skeleton } from '../../../shared/ui/Skeleton'
import { OrderTicket } from './OrderTicket'

type Props = {
  orders: OrderSummary[] | undefined
  role: Role
  now: number
  emptyText: string
}

const GRID = 'grid items-start gap-x-5 gap-y-6 [grid-template-columns:repeat(auto-fill,minmax(min(100%,264px),1fr))]'

function TicketSkeleton() {
  return (
    <div className="ticket-perforated rounded-b-ticket bg-ticket pt-6 pr-4 pb-4 pl-6">
      <div className="flex justify-between">
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-4 w-10" />
      </div>
      <Skeleton className="mt-3 h-3 w-24" />
      <Divider className="mt-4" />
      <Skeleton className="mt-3 h-4 w-4/5" />
      <Skeleton className="mt-2 h-4 w-3/5" />
      <Divider className="mt-4" />
      <Skeleton className="mt-3 ml-auto h-5 w-20" />
      <Skeleton className="mt-4 h-11 w-full" />
    </div>
  )
}

/** Tickets hang from a thin mostaza rail, like comandas clipped above the pass. */
export function TicketRail({ orders, role, now, emptyText }: Props) {
  return (
    <div className="mt-6">
      <div aria-hidden="true" className="h-[3px] rounded-full bg-mostaza" />
      {orders === undefined ? (
        <div className={GRID} aria-busy="true" aria-label="Cargando órdenes">
          {[0, 1, 2].map((i) => (
            <TicketSkeleton key={i} />
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
          {orders.length === 0 && (
            <div className="mx-auto mt-0 max-w-xs rounded-b-ticket border-x border-b border-dashed border-ink/20 px-6 py-10 text-center">
              <p className="font-medium text-ink">{emptyText}</p>
              <p className="mt-1 text-sm text-humo">Las nuevas aparecen aquí solas.</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
