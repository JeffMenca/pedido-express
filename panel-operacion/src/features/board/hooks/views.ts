import type { OrderStatus, OrderSummary, Role } from '../../../shared/http/contract'
import type { SceneName } from '../../../shared/lib/illustrations'

export type BoardStatus = Extract<OrderStatus, 'PENDIENTE_PAGO' | 'PAGADA' | 'EN_PREPARACION' | 'LISTA'>
export type ViewSlug = 'por-cobrar' | 'pagadas' | 'en-cocina' | 'listas'

export type ViewDef = {
  slug: ViewSlug
  status: BoardStatus
  title: string
  hint: string
  hintByRole?: Partial<Record<Role, string>>
  empty: { scene: SceneName; title: string; next: string }
}

export const VIEW_PARAM = 'vista'

const ALL_VIEWS: ViewDef[] = [
  {
    slug: 'por-cobrar',
    status: 'PENDIENTE_PAGO',
    title: 'Por cobrar',
    hint: 'Cobra las órdenes en efectivo para enviarlas a cocina.',
    empty: {
      scene: 'recibido',
      title: 'No hay cobros pendientes.',
      next: 'Las órdenes en efectivo aparecen aquí en cuanto el cliente las confirma.',
    },
  },
  {
    slug: 'pagadas',
    status: 'PAGADA',
    title: 'Pagadas',
    hint: 'Órdenes pagadas que esperan a cocina.',
    hintByRole: { COCINA: 'Inicia la preparación de cada orden pagada.' },
    empty: {
      scene: 'pagado',
      title: 'Ninguna orden espera a cocina.',
      next: 'Las órdenes aparecen aquí al quedar pagadas, con tarjeta o en caja.',
    },
  },
  {
    slug: 'en-cocina',
    status: 'EN_PREPARACION',
    title: 'En cocina',
    hint: 'Lo que cocina está preparando ahora.',
    hintByRole: { COCINA: 'Marca cada orden como lista al terminarla.' },
    empty: {
      scene: 'cocina',
      title: 'Nada en preparación.',
      next: 'Las órdenes aparecen aquí cuando cocina las inicia.',
    },
  },
  {
    slug: 'listas',
    status: 'LISTA',
    title: 'Listas',
    hint: 'Órdenes listas que esperan entrega.',
    hintByRole: { CAJERO: 'Entrega cada orden al cliente y márcala como entregada.' },
    empty: {
      scene: 'lista',
      title: 'Nada por entregar todavía.',
      next: 'Las órdenes aparecen aquí cuando cocina las marca listas.',
    },
  },
]

const DEFAULT_VIEW: Record<Role, ViewSlug> = {
  CAJERO: 'por-cobrar',
  COCINA: 'pagadas',
  SUPERVISOR: 'pagadas',
}

export function viewsForRole(role: Role): ViewDef[] {
  return role === 'COCINA' ? ALL_VIEWS.filter((v) => v.status !== 'PENDIENTE_PAGO') : ALL_VIEWS
}

export function hintFor(view: ViewDef, role: Role): string {
  return view.hintByRole?.[role] ?? view.hint
}

/** The requested view when the role may see it, otherwise the role's default. */
export function resolveView(role: Role, requested: string | null): ViewDef {
  const views = viewsForRole(role)
  return views.find((v) => v.slug === requested) ?? views.find((v) => v.slug === DEFAULT_VIEW[role]) ?? views[0]
}

export function groupByView(orders: OrderSummary[], views: ViewDef[]): Map<BoardStatus, OrderSummary[]> {
  const groups = new Map<BoardStatus, OrderSummary[]>(views.map((v) => [v.status, []]))
  for (const order of orders) {
    // Card orders waiting on the gateway are not actionable by the cashier.
    if (order.status === 'PENDIENTE_PAGO' && order.paymentMethod !== 'EFECTIVO') continue
    groups.get(order.status as BoardStatus)?.push(order)
  }
  return groups
}
