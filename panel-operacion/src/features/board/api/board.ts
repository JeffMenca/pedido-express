import { http } from '../../../shared/http/client'
import type { OrderStatus, OrderSummary } from '../../../shared/http/contract'

export function fetchOperationsOrders(statuses: OrderStatus[], signal?: AbortSignal): Promise<OrderSummary[]> {
  const query = encodeURIComponent(statuses.join(','))
  return http<OrderSummary[]>(`/operations/orders?status=${query}`, { signal })
}
