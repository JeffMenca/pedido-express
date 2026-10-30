import { http } from '../../../shared/http/client'
import type { Order } from '../../../shared/http/contract'

export type StaffTransition = 'EN_PREPARACION' | 'LISTA' | 'ENTREGADA'

export function updateOrderStatus(orderId: string, status: StaffTransition): Promise<Order> {
  return http<Order>(`/orders/${encodeURIComponent(orderId)}/status`, { method: 'PATCH', body: { status } })
}

export function confirmCashPayment(orderId: string, receivedCents: number): Promise<{ order: Order; changeCents: number }> {
  return http(`/orders/${encodeURIComponent(orderId)}/payments/cash`, { method: 'POST', body: { receivedCents } })
}

export function cancelOrder(orderId: string, reason: string): Promise<Order> {
  return http<Order>(`/orders/${encodeURIComponent(orderId)}/cancel`, { method: 'POST', body: { reason } })
}
