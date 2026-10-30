import { readFileSync } from 'fs';
import { join } from 'path';
import { normalizeMenu } from './menu-normalizer';

const rawMenu = JSON.parse(
  readFileSync(join(__dirname, '../../../../../datos/menu.json'), 'utf8'),
);

describe('normalizeMenu', () => {
  const { catalog, report } = normalizeMenu(rawMenu);
  const product = (sku: string) => catalog.products.find((p) => p.sku === sku);
  const reasonFor = (key: string) =>
    report.filter((r) => r.key === key).map((r) => r.reason);

  it('corrects numeric strings into cents', () => {
    expect(product('P-004')?.priceCents).toBe(2990);
    expect(
      catalog.combos.find((c) => c.sku === 'C-003')?.upgrade?.priceCents,
    ).toBe(800);
    expect(catalog.modifiers.find((m) => m.code === 'M-05')?.priceCents).toBe(
      400,
    );
  });

  it.each([
    ['P-010', 'EMPTY_PRICE'],
    ['P-011', 'NEGATIVE_PRICE'],
    ['P-012', 'EMPTY_PRICE'],
    ['P-013', 'EMPTY_NAME'],
    ['P-014', 'INVALID_PRICE'],
  ])('discards %s (%s)', (sku, reason) => {
    expect(product(sku)).toBeUndefined();
    expect(reasonFor(sku)).toContain(reason);
  });

  it('keeps the first occurrence of a duplicated sku', () => {
    expect(catalog.products.filter((p) => p.sku === 'P-002')).toHaveLength(1);
    expect(product('P-002')?.priceCents).toBe(4550);
    expect(reasonFor('P-002')).toContain('DUPLICATE_KEY');
  });

  it('keeps inactive or unavailable items as not sellable', () => {
    expect(product('P-009')).toMatchObject({ available: false });
    expect(product('P-015')).toMatchObject({ active: false });
    expect(catalog.modifiers.find((m) => m.code === 'M-04')?.active).toBe(
      false,
    );
  });

  it('flags combos whose main product is not sellable', () => {
    expect(reasonFor('C-004')).toContain('MAIN_PRODUCT_NOT_SELLABLE');
  });

  it('normalizes coupon codes to upper case and drops case-insensitive duplicates', () => {
    expect(catalog.coupons.map((c) => c.code).sort()).toEqual([
      'COMBO15',
      'FERIA10',
      'FIJO20',
    ]);
    expect(catalog.coupons.find((c) => c.code === 'COMBO15')).toMatchObject({
      value: 1500,
      minimumCents: 10000,
    });
    expect(reasonFor('combo15')).toContain('DUPLICATE_KEY');
  });

  it('discards modifiers with an empty name', () => {
    expect(catalog.modifiers.find((m) => m.code === 'M-06')).toBeUndefined();
  });

  it('reads pricing parameters in cents and basis points', () => {
    expect(catalog.parameters).toEqual({
      taxRateBasisPoints: 1200,
      deliveryFeeCents: 1500,
      maxQuantityPerLine: 20,
      maxItemsPerOrder: 30,
    });
  });
});
