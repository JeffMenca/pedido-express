import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import type { Role } from '../../../shared/http/contract'
import { errorMessage } from '../../../shared/http/errors'
import { EASE_OUT_QUART } from '../../../shared/lib/motion'
import { useNow } from '../../../shared/lib/time'
import { BrandMark } from '../../../shared/ui/BrandMark'
import { Icon } from '../../../shared/ui/Icon'
import { useActiveView } from '../hooks/useActiveView'
import { useBoardOrders } from '../hooks/useBoardOrders'
import { useSidebarCollapsed } from '../hooks/useSidebarCollapsed'
import { DEFAULT_FILTERS, applyFilters, isFiltering, type OrderFilters } from '../hooks/orderFilters'
import { groupByView, hintFor, viewsForRole, type ViewSlug } from '../hooks/views'
import { FilterBar } from './FilterBar'
import { PollingNotice } from './PollingNotice'
import { Sidebar, SidebarDrawer } from './Sidebar'
import { TicketRail } from './TicketRail'
import { ViewHeader } from './ViewHeader'

type Props = { username: string; role: Role; onSignOut: () => void }

export function BoardPage({ username, role, onSignOut }: Props) {
  const views = useMemo(() => viewsForRole(role), [role])
  const view = useActiveView(role)
  const query = useBoardOrders(views)
  const now = useNow(1000)
  const [collapsed, toggleCollapsed] = useSidebarCollapsed()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [filters, setFilters] = useState<OrderFilters>(DEFAULT_FILTERS)

  const groups = useMemo(() => (query.data ? groupByView(query.data, views) : null), [query.data, views])
  const counts = useMemo(() => {
    const result: Partial<Record<ViewSlug, number>> = {}
    if (groups) for (const v of views) result[v.slug] = groups.get(v.status)?.length ?? 0
    return result
  }, [groups, views])
  const viewOrders = groups?.get(view.status)
  const orders = useMemo(() => (viewOrders ? applyFilters(viewOrders, filters) : undefined), [viewOrders, filters])
  const filteredOut = isFiltering(filters) && orders?.length === 0 && (viewOrders?.length ?? 0) > 0

  useEffect(() => {
    if (!drawerOpen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDrawerOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [drawerOpen])

  const navProps = { views, counts, activeSlug: view.slug, username, role, onSignOut }

  return (
    <div className="flex h-dvh bg-steel text-ink">
      <Sidebar {...navProps} collapsed={collapsed} onToggle={toggleCollapsed} />

      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              key="backdrop"
              className="fixed inset-0 z-40 bg-ink/50 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.15 } }}
              onClick={() => setDrawerOpen(false)}
            />
            <SidebarDrawer key="drawer" {...navProps} onClose={() => setDrawerOpen(false)} />
          </>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center gap-3 bg-ink px-2 text-white lg:hidden">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Abrir menú"
            aria-expanded={drawerOpen}
            className="grid size-11 place-items-center rounded-control text-white/80 hover:text-white focus-visible:outline-2 focus-visible:outline-mostaza"
          >
            <Icon name="menu" />
          </button>
          <BrandMark className="size-8" />
          <span className="font-display text-base font-bold tracking-tight">Pedido Express</span>
        </header>

        <main className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait" initial={false}>
            <motion.section
              key={view.slug}
              aria-label={view.title}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { duration: 0.22, ease: EASE_OUT_QUART } }}
              exit={{ opacity: 0, transition: { duration: 0.12 } }}
              className="mx-auto max-w-[1440px] px-4 pt-8 pb-16 sm:px-8 lg:px-12 lg:pt-12"
            >
              {query.isError && (
                <PollingNotice
                  cause={errorMessage(query.error)}
                  hasData={query.data !== undefined}
                  retrying={query.isFetching}
                  onRetry={() => void query.refetch()}
                />
              )}
              <ViewHeader title={view.title} hint={hintFor(view, role)} count={orders?.length} />
              <FilterBar filters={filters} onChange={setFilters} shown={orders?.length} total={viewOrders?.length} />
              {filteredOut ? (
                <div className="mt-16 flex flex-col items-center text-center">
                  <p className="font-display text-xl font-bold">Ninguna orden coincide con los filtros.</p>
                  <p className="mt-2 text-sm text-humo">Prueba con otro número, canal o método de pago.</p>
                  <button
                    type="button"
                    onClick={() => setFilters({ ...DEFAULT_FILTERS, sort: filters.sort })}
                    className="mt-5 h-11 rounded-control bg-ink px-5 text-sm font-semibold text-white active:scale-[0.97]"
                  >
                    Limpiar filtros
                  </button>
                </div>
              ) : (
                !(query.isError && query.data === undefined) && (
                  <TicketRail orders={orders} role={role} now={now} empty={view.empty} />
                )
              )}
            </motion.section>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}
