import { AnimatePresence, motion } from 'framer-motion'
import type { ReactNode } from 'react'
import type { Channel, PaymentMethod } from '../../../shared/http/contract'
import { Icon } from '../../../shared/ui/Icon'
import { DEFAULT_FILTERS, isFiltering, type OrderFilters } from '../hooks/orderFilters'

type Props = {
  filters: OrderFilters
  onChange: (filters: OrderFilters) => void
  shown: number | undefined
  total: number | undefined
}

const CHANNELS: { value: Channel | 'TODOS'; label: string }[] = [
  { value: 'TODOS', label: 'Todos los canales' },
  { value: 'MOSTRADOR', label: 'Mostrador' },
  { value: 'KIOSKO', label: 'Kiosko' },
  { value: 'AUTOSERVICIO', label: 'Autoservicio' },
  { value: 'DOMICILIO', label: 'Domicilio' },
]

const PAYMENTS: { value: PaymentMethod | 'TODOS'; label: string }[] = [
  { value: 'TODOS', label: 'Todos los pagos' },
  { value: 'TARJETA', label: 'Tarjeta' },
  { value: 'EFECTIVO', label: 'Efectivo' },
]

const CONTROL =
  'h-11 rounded-control border border-ink/10 bg-ticket text-sm text-ink transition-colors hover:border-ink/25 focus-visible:border-ink focus-visible:outline-none'

function Select<T extends string>(props: {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
  active: boolean
}): ReactNode {
  return (
    <label className="relative">
      <span className="sr-only">{props.label}</span>
      <select
        value={props.value}
        onChange={(event) => props.onChange(event.target.value as T)}
        className={`${CONTROL} appearance-none pr-9 pl-3.5 ${props.active ? 'border-ink font-semibold' : ''}`}
      >
        {props.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <Icon name="chevron-left" className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 -rotate-90 text-humo" />
    </label>
  )
}

export function FilterBar({ filters, onChange, shown, total }: Props) {
  const set = <K extends keyof OrderFilters>(key: K, value: OrderFilters[K]) => onChange({ ...filters, [key]: value })
  const filtering = isFiltering(filters)

  return (
    <div className="mt-6 flex flex-wrap items-center gap-2.5" role="search" aria-label="Filtrar órdenes">
      <label className="relative min-w-56 flex-1 basis-64">
        <span className="sr-only">Buscar por número o producto</span>
        <Icon name="search" className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-humo" />
        <input
          type="search"
          value={filters.search}
          onChange={(event) => set('search', event.target.value)}
          placeholder="Buscar por número o producto"
          className={`${CONTROL} w-full pr-3 pl-10 placeholder:text-humo`}
        />
      </label>

      <Select label="Canal" value={filters.channel} options={CHANNELS} onChange={(v) => set('channel', v)} active={filters.channel !== 'TODOS'} />
      <Select label="Método de pago" value={filters.payment} options={PAYMENTS} onChange={(v) => set('payment', v)} active={filters.payment !== 'TODOS'} />

      <button
        type="button"
        onClick={() => set('sort', filters.sort === 'recientes' ? 'antiguas' : 'recientes')}
        aria-label={`Ordenar: ${filters.sort === 'recientes' ? 'más recientes primero' : 'más antiguas primero'}`}
        className={`${CONTROL} inline-flex items-center gap-2 px-3.5 font-medium active:scale-[0.97]`}
      >
        <motion.span animate={{ rotate: filters.sort === 'recientes' ? 0 : 180 }} transition={{ type: 'spring', stiffness: 400, damping: 30 }} className="inline-flex">
          <Icon name="sort" className="size-4" />
        </motion.span>
        {filters.sort === 'recientes' ? 'Más recientes' : 'Más antiguas'}
      </button>

      <AnimatePresence initial={false}>
        {filtering && (
          <motion.div
            key="clear"
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -6, transition: { duration: 0.12 } }}
            className="flex items-center gap-3"
          >
            <span className="font-mono text-xs text-humo tabular-nums">
              {shown ?? 0} de {total ?? 0}
            </span>
            <button
              type="button"
              onClick={() => onChange({ ...DEFAULT_FILTERS, sort: filters.sort })}
              className="text-sm font-semibold text-salsa underline-offset-4 hover:underline"
            >
              Limpiar filtros
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
