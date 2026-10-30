import { readFileSync } from 'fs';
import { join } from 'path';
import { FixedDateClock } from '../../../common/clock/clock';
import { Catalog } from '../domain/catalog';
import { normalizeMenu } from '../domain/menu-normalizer';
import { CatalogRepository } from './catalog.repository';
import { MenuService } from './menu.service';

const { catalog } = normalizeMenu(
  JSON.parse(
    readFileSync(join(__dirname, '../../../../../datos/menu.json'), 'utf8'),
  ),
);

class InMemoryCatalog extends CatalogRepository {
  async load(): Promise<Catalog> {
    return catalog;
  }
}

describe('MenuService', () => {
  const menu = new MenuService(
    new InMemoryCatalog(),
    new FixedDateClock('2026-10-30'),
  );

  it('exposes only sellable products and combos', async () => {
    const result = await menu.getSellableMenu();
    const skus = result.categories.flatMap((c) => c.products.map((p) => p.sku));
    expect(skus).not.toContain('P-009');
    expect(skus).not.toContain('P-015');
    expect(result.combos.map((c) => c.sku)).toEqual([
      'C-001',
      'C-002',
      'C-003',
    ]);
  });

  it('lists only coupons valid on the business date', async () => {
    const { promotions } = await menu.getSellableMenu();
    expect(promotions.map((p) => p.code).sort()).toEqual(['COMBO15', 'FIJO20']);
  });
});
