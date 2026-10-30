import type { Menu } from '../../../shared/http/contract'

export type ProductArt = { sku: string | null; tint: string }

const COMBO_TINT = '#FFF1C9'
const NEUTRAL_TINT = '#EEF0F3'
const CATEGORY_TINT: Record<string, string> = {
  HAMBURGUESAS: '#FBE3D4',
  POLLO: '#FDEBC8',
  ACOMPAÑAMIENTOS: '#FDE2DF',
  BEBIDAS: '#DDEBF7',
}

export function normalizeName(name: string): string {
  return name.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase()
}

/**
 * Order summaries only carry the product name, so the board maps names back to
 * SKUs (and their category tint) through the public menu.
 */
export function buildArtIndex(menu: Menu): Map<string, ProductArt> {
  const index = new Map<string, ProductArt>()
  for (const category of menu.categories) {
    const tint = CATEGORY_TINT[category.code] ?? NEUTRAL_TINT
    for (const product of category.products) index.set(normalizeName(product.name), { sku: product.sku, tint })
  }
  for (const combo of menu.combos) index.set(normalizeName(combo.name), { sku: combo.sku, tint: COMBO_TINT })
  return index
}

export const UNKNOWN_ART: ProductArt = { sku: null, tint: NEUTRAL_TINT }
