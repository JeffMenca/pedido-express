import { describe, expect, it } from 'vitest'
import type { OrderSummary } from '../../../shared/http/contract'
import { columnsForRole, groupByColumn } from './columns'

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

describe('board columns', () => {
  it('hides the cash column from the kitchen', () => {
    expect(columnsForRole('COCINA').map((c) => c.status)).toEqual(['PAGADA', 'EN_PREPARACION', 'LISTA'])
    expect(columnsForRole('CAJERO')[0].status).toBe('PENDIENTE_PAGO')
  })

  it('only lists cash orders as pending payment', () => {
    const groups = groupByColumn(
      [order('a', 'PENDIENTE_PAGO', 'EFECTIVO'), order('b', 'PENDIENTE_PAGO', 'TARJETA'), order('c', 'PAGADA', 'TARJETA')],
      columnsForRole('SUPERVISOR'),
    )
    expect(groups.get('PENDIENTE_PAGO')?.map((o) => o.id)).toEqual(['a'])
    expect(groups.get('PAGADA')?.map((o) => o.id)).toEqual(['c'])
  })
})
