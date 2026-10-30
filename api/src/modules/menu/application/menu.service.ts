import { Injectable } from '@nestjs/common';
import { Clock, guatemalaDate } from '../../../common/clock/clock';
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
  constructor(
    private readonly catalogRepository: CatalogRepository,
    private readonly clock: Clock,
  ) {}

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

    const today = guatemalaDate(this.clock.now());
    const promotions = catalog.coupons
      .filter((c) => c.active && c.validFrom <= today && today <= c.validTo)
      .map(({ code, type, value, minimumCents, validTo }) => ({
        code,
        type,
        value,
        minimumCents,
        validTo,
      }));

    return { categories, combos, modifiers, promotions };
  }
}
