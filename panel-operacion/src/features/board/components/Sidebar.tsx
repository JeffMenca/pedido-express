import { motion, useReducedMotion } from 'framer-motion'
import { Link } from 'react-router-dom'
import type { Role } from '../../../shared/http/contract'
import { BrandMark } from '../../../shared/ui/BrandMark'
import { Icon } from '../../../shared/ui/Icon'
import { Odometer } from '../../../shared/ui/Odometer'
import { Skeleton } from '../../../shared/ui/Skeleton'
import { VIEW_PARAM, type ViewDef, type ViewSlug } from '../hooks/views'
import { ROLE_LABEL, VIEW_ICON } from './viewMeta'

const WIDTH = { expanded: 256, collapsed: 84 }

type Props = {
  views: ViewDef[]
  counts: Partial<Record<ViewSlug, number>>
  activeSlug: ViewSlug
  collapsed: boolean
  username: string
  role: Role
  onSignOut: () => void
  /** Distinguishes the drawer's active marker from the desktop one so they never share a layout animation. */
  markerId: string
  onNavigate?: () => void
}

function SidebarBody({ views, counts, activeSlug, collapsed, username, role, onSignOut, markerId, onNavigate }: Props) {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className={`flex h-20 shrink-0 items-center gap-3 ${collapsed ? 'justify-center' : 'px-6'}`}>
        <BrandMark />
        {!collapsed && (
          <div className="min-w-0 leading-tight">
            <p className="truncate font-display text-[17px] font-bold tracking-tight">Pedido Express</p>
            <p className="text-xs text-white/55">Operación</p>
          </div>
        )}
      </div>

      <nav aria-label="Vistas" className="mt-2 flex-1">
        <ul className="space-y-1">
          {views.map((view) => {
            const active = view.slug === activeSlug
            const count = counts[view.slug]
            return (
              <li key={view.slug} className="relative mx-3">
                {active && (
                  <motion.span
                    layoutId={markerId}
                    aria-hidden="true"
                    className="absolute inset-y-1.5 -left-3 w-1 rounded-r-sm bg-mostaza"
                    transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                  />
                )}
                <Link
                  to={{ search: `?${VIEW_PARAM}=${view.slug}` }}
                  onClick={onNavigate}
                  aria-current={active ? 'page' : undefined}
                  aria-label={collapsed && count !== undefined ? `${view.title}, ${count} ${count === 1 ? 'orden' : 'órdenes'}` : collapsed ? view.title : undefined}
                  title={collapsed ? view.title : undefined}
                  className={`flex rounded-control transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mostaza ${
                    active ? 'bg-white/[0.07] text-white' : 'text-white/65 hover:bg-white/[0.04] hover:text-white'
                  } ${collapsed ? 'min-h-14 flex-col items-center justify-center gap-1' : 'min-h-12 items-center gap-3 px-3'}`}
                >
                  <Icon name={VIEW_ICON[view.slug]} />
                  {!collapsed && <span className="flex-1 truncate text-[15px] font-medium">{view.title}</span>}
                  <span
                    className={`font-mono tabular-nums ${collapsed ? 'text-[11px]' : 'text-sm'} ${
                      active ? 'font-bold text-white' : 'font-medium'
                    }`}
                  >
                    {count === undefined ? (
                      <Skeleton tone="dark" className={`${collapsed ? 'h-2.5 w-4' : 'h-3 w-5'} rounded-sm`} />
                    ) : (
                      <Odometer value={count} />
                    )}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className={`shrink-0 border-t border-white/10 py-4 ${collapsed ? 'flex flex-col items-center gap-2' : 'px-6'}`}>
        {collapsed ? (
          <span
            title={`${username} · ${ROLE_LABEL[role]}`}
            className="grid size-9 place-items-center rounded-full bg-white/10 font-mono text-sm font-bold uppercase"
          >
            {username.slice(0, 1)}
          </span>
        ) : (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{username}</p>
            <p className="text-xs text-white/55">{ROLE_LABEL[role]}</p>
          </div>
        )}
        <button
          type="button"
          onClick={onSignOut}
          aria-label={collapsed ? 'Cerrar sesión' : undefined}
          title={collapsed ? 'Cerrar sesión' : undefined}
          className={`flex min-h-11 items-center gap-2 rounded-control text-sm text-white/65 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-mostaza ${
            collapsed ? 'w-11 justify-center' : '-ml-2 mt-2 px-2'
          }`}
        >
          <Icon name="logout" className="size-[18px]" />
          {!collapsed && 'Cerrar sesión'}
        </button>
      </div>
    </div>
  )
}

type DesktopProps = Omit<Props, 'markerId' | 'onNavigate'> & { onToggle: () => void }

export function Sidebar({ onToggle, ...props }: DesktopProps) {
  const reduceMotion = useReducedMotion()
  const { collapsed } = props
  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? WIDTH.collapsed : WIDTH.expanded }}
      transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 36 }}
      className="relative z-20 hidden h-dvh shrink-0 bg-ink text-white lg:block"
    >
      <SidebarBody {...props} markerId="nav-marker-desktop" />
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={!collapsed}
        aria-label={collapsed ? 'Expandir menú' : 'Contraer menú'}
        className="group absolute top-[88px] -right-[22px] grid size-11 place-items-center rounded-full focus-visible:outline-none"
      >
        <span className="grid size-7 place-items-center rounded-full border border-ink/10 bg-ticket text-ink shadow-[0_2px_6px_rgb(27_26_34/0.18)] transition-transform group-hover:scale-110 group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-ink">
          <Icon
            name="chevron-left"
            strokeWidth={2.25}
            className={`size-4 transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`}
          />
        </span>
      </button>
    </motion.aside>
  )
}

type DrawerProps = Omit<Props, 'markerId' | 'collapsed'> & { onClose: () => void }

export function SidebarDrawer({ onClose, ...props }: DrawerProps) {
  return (
    <motion.aside
      role="dialog"
      aria-modal="true"
      aria-label="Menú"
      initial={{ x: '-100%' }}
      animate={{ x: 0 }}
      exit={{ x: '-100%', transition: { duration: 0.18 } }}
      transition={{ type: 'spring', stiffness: 420, damping: 40 }}
      className="fixed inset-y-0 left-0 z-50 w-[min(86vw,288px)] bg-ink text-white lg:hidden"
    >
      <SidebarBody {...props} collapsed={false} markerId="nav-marker-drawer" onNavigate={onClose} />
      <button
        type="button"
        autoFocus
        onClick={onClose}
        aria-label="Cerrar menú"
        className="absolute top-4 right-3 grid size-11 place-items-center rounded-control text-white/70 hover:text-white focus-visible:outline-2 focus-visible:outline-mostaza"
      >
        <Icon name="close" />
      </button>
    </motion.aside>
  )
}
