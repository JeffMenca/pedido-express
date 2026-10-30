import { describe, expect, it } from 'vitest'
import type { OrderSummary } from '../../../shared/http/contract'
import { DEFAULT_FILTERS, applyFilters, isFiltering } from './orderFilters'

const order = (code: string, createdAt: string, extra: Partial<OrderSummary> = {}): OrderSummary => ({
  id: code,
  code,
  channel: 'MOSTRADOR',
  paymentMethod: 'TARJETA',
  status: 'PAGADA',
  totalCents: 1000,
  lines: [{ name: 'Combo Clásico', quantity: 1 }],
  createdAt,
  updatedAt: createdAt,
  ...extra,
})

const orders = [
  order('PE-0001', '2026-10-30T15:00:00Z'),
  order('PE-0002', '2026-10-30T15:10:00Z', { channel: 'DOMICILIO', lines: [{ name: 'Nuggets de pollo', quantity: 2 }] }),
  order('PE-0003', '2026-10-30T15:05:00Z', { paymentMethod: 'EFECTIVO', channel: 'KIOSKO' }),
]

const codes = (list: OrderSummary[]) => list.map((o) => o.code)

describe('applyFilters', () => {
  it('sorts newest first by default', () => {
    expect(codes(applyFilters(orders, DEFAULT_FILTERS))).toEqual(['PE-0002', 'PE-0003', 'PE-0001'])
  })

  it('can sort oldest first', () => {
    expect(codes(applyFilters(orders, { ...DEFAULT_FILTERS, sort: 'antiguas' }))).toEqual(['PE-0001', 'PE-0003', 'PE-0002'])
  })

  it('filters by channel and payment method', () => {
    expect(codes(applyFilters(orders, { ...DEFAULT_FILTERS, channel: 'DOMICILIO' }))).toEqual(['PE-0002'])
    expect(codes(applyFilters(orders, { ...DEFAULT_FILTERS, payment: 'EFECTIVO' }))).toEqual(['PE-0003'])
  })

  it('searches by order number or product, ignoring case and accents', () => {
    expect(codes(applyFilters(orders, { ...DEFAULT_FILTERS, search: '3' }))).toEqual(['PE-0003'])
    expect(codes(applyFilters(orders, { ...DEFAULT_FILTERS, search: 'pe-0001' }))).toEqual(['PE-0001'])
    expect(codes(applyFilters(orders, { ...DEFAULT_FILTERS, search: 'clasico' }))).toEqual(['PE-0003', 'PE-0001'])
  })

  it('does not mutate the input', () => {
    const copy = [...orders]
    applyFilters(orders, DEFAULT_FILTERS)
    expect(orders).toEqual(copy)
  })

  it('reports whether any filter beyond sorting is active', () => {
    expect(isFiltering(DEFAULT_FILTERS)).toBe(false)
    expect(isFiltering({ ...DEFAULT_FILTERS, sort: 'antiguas' })).toBe(false)
    expect(isFiltering({ ...DEFAULT_FILTERS, channel: 'KIOSKO' })).toBe(true)
  })
})
