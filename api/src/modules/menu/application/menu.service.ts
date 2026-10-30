import { Injectable } from '@nestjs/common';
import { isComboSellable, isProductSellable } from '../domain/catalog';
import { CatalogRepository } from './catalog.repository';

const CATEGORY_NAMES: Record<string, string> = {
  HAMBURGUESAS: 'Hamburguesas',
  POLLO: 'Pollo',
  ACOMPAÑAMIENTOS: 'Acompañamientos',
  BEBIDAS: 'Bebidas',
  POSTRES: 'Postres',
  ENSALADAS: 'Ensaladas',
};

@Injectable()
export class MenuService {
  constructor(private readonly catalogRepository: CatalogRepository) {}

  async getSellableMenu() {
    const catalog = await this.catalogRepository.load();
    const productsBySku = new Map(catalog.products.map((p) => [p.sku, p]));
    const sellableProducts = catalog.products.filter(isProductSellable);

    const categories = [
      ...new Set(sellableProducts.map((p) => p.category)),
    ].map((code) => ({
      code,
      name: CATEGORY_NAMES[code] ?? code,
      products: sellableProducts
        .filter((p) => p.category === code)
        .map(({ sku, name, priceCents }) => ({ sku, name, priceCents })),
    }));

    const combos = catalog.combos
      .filter((c) => isComboSellable(c, productsBySku))
      .map((c) => ({
        sku: c.sku,
        name: c.name,
        priceCents: c.priceCents,
        mainSku: c.mainSku,
        mainCategory: productsBySku.get(c.mainSku)?.category ?? '',
        includes: [c.mainSku, ...c.sideSkus, ...c.drinkSkus].map(
          (sku) => productsBySku.get(sku)?.name ?? sku,
        ),
        upgrade: c.upgrade
          ? {
              priceCents: c.upgrade.priceCents,
              includes: [c.upgrade.sideSku, c.upgrade.drinkSku].map(
                (sku) => productsBySku.get(sku)?.name ?? sku,
              ),
            }
          : null,
      }));

    const modifiers = catalog.modifiers
      .filter((m) => m.active)
      .map(({ code, name, priceCents, appliesTo }) => ({
        code,
        name,
        priceCents,
        appliesTo,
      }));

    return { categories, combos, modifiers };
  }
}
