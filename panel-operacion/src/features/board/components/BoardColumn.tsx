import { AnimatePresence } from 'framer-motion'
import type { OrderSummary, Role } from '../../../shared/http/contract'
import { Skeleton } from '../../../shared/ui/Skeleton'
import type { ColumnDef } from '../hooks/columns'
import { OrderCard } from './OrderCard'

type Props = {
  column: ColumnDef
  orders: OrderSummary[] | undefined
  role: Role
  now: number
}

export function BoardColumn({ column, orders, role, now }: Props) {
  const headingId = `col-${column.status}`
  return (
    <section aria-labelledby={headingId} className="flex min-w-0 flex-col rounded-xl bg-stone-100/70 p-3">
      <header className="flex items-baseline justify-between px-1 pb-3">
        <h2 id={headingId} className="text-sm font-semibold text-stone-800">
          {column.title}
        </h2>
        <span className="text-sm tabular-nums text-stone-500" aria-label={`${orders?.length ?? 0} órdenes`}>
          {orders ? orders.length : ''}
        </span>
      </header>

      {orders === undefined ? (
        <div className="space-y-3" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-xl border border-stone-200 bg-white p-4">
              <div className="flex justify-between">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-4 w-10" />
              </div>
              <Skeleton className="mt-2 h-3 w-24" />
              <Skeleton className="mt-3 h-4 w-full" />
              <Skeleton className="mt-3 ml-auto h-5 w-20" />
              <Skeleton className="mt-3 h-11 w-full" />
            </div>
          ))}
        </div>
      ) : (
        <ul className="relative flex flex-1 flex-col gap-3">
          <AnimatePresence mode="popLayout" initial={false}>
            {orders.map((order, index) => (
              <OrderCard key={order.id} order={order} role={role} accent={column.accent} now={now} index={index} />
            ))}
          </AnimatePresence>
          {orders.length === 0 && <li className="px-1 py-6 text-center text-sm text-stone-500">{column.emptyText}</li>}
        </ul>
      )}
    </section>
  )
}
