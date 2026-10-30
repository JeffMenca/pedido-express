import { describe, expect, it } from 'vitest'
import type { OrderSummary } from '../../../shared/http/contract'
import { groupByView, resolveView, viewsForRole } from './views'

const order = (id: string, status: OrderSummary['status'], paymentMethod: OrderSummary['paymentMethod']): OrderSummary => ({
  id,
  code: id,
  channel: 'MOSTRADOR',
  paymentMethod,
  status,
  totalCents: 1000,
  createdAt: '2026-10-30T15:00:00Z',
  updatedAt: '2026-10-30T15:00:00Z',
})

describe('board views', () => {
  it('hides the cash view from the kitchen', () => {
    expect(viewsForRole('COCINA').map((v) => v.slug)).toEqual(['pagadas', 'en-cocina', 'listas'])
    expect(viewsForRole('CAJERO')[0].slug).toBe('por-cobrar')
  })

  it('opens each role on its own default view', () => {
    expect(resolveView('CAJERO', null).slug).toBe('por-cobrar')
    expect(resolveView('COCINA', null).slug).toBe('pagadas')
    expect(resolveView('SUPERVISOR', null).slug).toBe('pagadas')
  })

  it('keeps a requested view from the URL unless the role cannot see it', () => {
    expect(resolveView('CAJERO', 'listas').slug).toBe('listas')
    expect(resolveView('COCINA', 'por-cobrar').slug).toBe('pagadas')
    expect(resolveView('SUPERVISOR', 'no-existe').slug).toBe('pagadas')
  })

  it('only lists cash orders as pending payment', () => {
    const groups = groupByView(
      [order('a', 'PENDIENTE_PAGO', 'EFECTIVO'), order('b', 'PENDIENTE_PAGO', 'TARJETA'), order('c', 'PAGADA', 'TARJETA')],
      viewsForRole('SUPERVISOR'),
    )
    expect(groups.get('PENDIENTE_PAGO')?.map((o) => o.id)).toEqual(['a'])
    expect(groups.get('PAGADA')?.map((o) => o.id)).toEqual(['c'])
  })
})
