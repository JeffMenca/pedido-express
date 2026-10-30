import type { OrderStatus, OrderSummary, Role } from '../../../shared/http/contract'

export type BoardStatus = Extract<OrderStatus, 'PENDIENTE_PAGO' | 'PAGADA' | 'EN_PREPARACION' | 'LISTA'>
export type ViewSlug = 'por-cobrar' | 'pagadas' | 'en-cocina' | 'listas'

export type ViewDef = {
  slug: ViewSlug
  status: BoardStatus
  title: string
  hint: string
  hintByRole?: Partial<Record<Role, string>>
  emptyText: string
}

export const VIEW_PARAM = 'vista'

const ALL_VIEWS: ViewDef[] = [
  {
    slug: 'por-cobrar',
    status: 'PENDIENTE_PAGO',
    title: 'Por cobrar',
    hint: 'Cobra las órdenes en efectivo para enviarlas a cocina.',
    emptyText: 'No hay órdenes en efectivo por cobrar.',
  },
  {
    slug: 'pagadas',
    status: 'PAGADA',
    title: 'Pagadas',
    hint: 'Órdenes pagadas que esperan a cocina.',
    hintByRole: { COCINA: 'Inicia cada orden en el orden en que llegó.' },
    emptyText: 'No hay órdenes esperando a cocina.',
  },
  {
    slug: 'en-cocina',
    status: 'EN_PREPARACION',
    title: 'En cocina',
    hint: 'Lo que cocina está preparando ahora.',
    hintByRole: { COCINA: 'Marca cada orden como lista al terminarla.' },
    emptyText: 'Nada en preparación.',
  },
  {
    slug: 'listas',
    status: 'LISTA',
    title: 'Listas',
    hint: 'Órdenes listas que esperan entrega.',
    hintByRole: { CAJERO: 'Entrega cada orden al cliente y márcala como entregada.' },
    emptyText: 'No hay órdenes por entregar.',
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
  for (const list of groups.values()) list.sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))
  return groups
}
