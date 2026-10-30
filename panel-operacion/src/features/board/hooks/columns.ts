import type { OrderStatus, OrderSummary, Role } from '../../../shared/http/contract'

export type BoardStatus = Extract<OrderStatus, 'PENDIENTE_PAGO' | 'PAGADA' | 'EN_PREPARACION' | 'LISTA'>

export type ColumnDef = { status: BoardStatus; title: string; accent: string; emptyText: string }

const ALL_COLUMNS: ColumnDef[] = [
  { status: 'PENDIENTE_PAGO', title: 'Por cobrar', accent: 'bg-amber-600', emptyText: 'Sin órdenes en efectivo por cobrar.' },
  { status: 'PAGADA', title: 'Pagadas', accent: 'bg-sky-700', emptyText: 'No hay órdenes esperando cocina.' },
  { status: 'EN_PREPARACION', title: 'En preparación', accent: 'bg-orange-700', emptyText: 'Nada en preparación.' },
  { status: 'LISTA', title: 'Listas', accent: 'bg-emerald-700', emptyText: 'No hay órdenes por entregar.' },
]

export function columnsForRole(role: Role): ColumnDef[] {
  return role === 'COCINA' ? ALL_COLUMNS.filter((c) => c.status !== 'PENDIENTE_PAGO') : ALL_COLUMNS
}

export function groupByColumn(orders: OrderSummary[], columns: ColumnDef[]): Map<BoardStatus, OrderSummary[]> {
  const groups = new Map<BoardStatus, OrderSummary[]>(columns.map((c) => [c.status, []]))
  for (const order of orders) {
    // Card orders waiting on the gateway are not actionable by the cashier.
    if (order.status === 'PENDIENTE_PAGO' && order.paymentMethod !== 'EFECTIVO') continue
    groups.get(order.status as BoardStatus)?.push(order)
  }
  for (const list of groups.values()) list.sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))
  return groups
}
