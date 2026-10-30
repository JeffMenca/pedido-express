import { describe, expect, it } from 'vitest'
import type { Menu } from '../../../shared/http/contract'
import { buildArtIndex, normalizeName } from './productArt'

const menu: Menu = {
  categories: [{ code: 'POLLO', name: 'Pollo', products: [{ sku: 'P-004', name: 'Nuggets de pollo (8 piezas)', priceCents: 2990 }] }],
  combos: [{ sku: 'C-001', name: 'Combo Clásico', priceCents: 5200, mainSku: 'P-001', mainCategory: 'HAMBURGUESAS' }],
}

describe('buildArtIndex', () => {
  it('maps line names to sku and category tint, ignoring accents and case', () => {
    const index = buildArtIndex(menu)
    expect(index.get(normalizeName('combo clasico'))).toEqual({ sku: 'C-001', tint: '#FFF1C9' })
    expect(index.get(normalizeName('Nuggets de pollo (8 piezas)'))?.sku).toBe('P-004')
  })
})
