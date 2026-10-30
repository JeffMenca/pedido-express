import type { Channel, OrderSummary, PaymentMethod } from '../../../shared/http/contract'

export type SortOrder = 'recientes' | 'antiguas'

export type OrderFilters = {
  search: string
  channel: Channel | 'TODOS'
  payment: PaymentMethod | 'TODOS'
  sort: SortOrder
}

export const DEFAULT_FILTERS: OrderFilters = { search: '', channel: 'TODOS', payment: 'TODOS', sort: 'recientes' }

const normalize = (text: string) => text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()

/** A bare number matches the order number ("42" → PE-0042); any other text matches the code or a product. */
function matchesSearch(order: OrderSummary, term: string): boolean {
  if (!term) return true
  if (/^\d+$/.test(term)) return Number(order.code.replace(/\D/g, '')) === Number(term)
  return normalize(order.code).includes(term) || (order.lines ?? []).some((line) => normalize(line.name).includes(term))
}

export function applyFilters(orders: OrderSummary[], filters: OrderFilters): OrderSummary[] {
  const term = normalize(filters.search)
  const direction = filters.sort === 'recientes' ? -1 : 1
  return orders
    .filter((o) => filters.channel === 'TODOS' || o.channel === filters.channel)
    .filter((o) => filters.payment === 'TODOS' || o.paymentMethod === filters.payment)
    .filter((o) => matchesSearch(o, term))
    .sort((a, b) => direction * (Date.parse(a.createdAt) - Date.parse(b.createdAt)))
}

export const isFiltering = (filters: OrderFilters): boolean =>
  filters.search.trim() !== '' || filters.channel !== 'TODOS' || filters.payment !== 'TODOS'
