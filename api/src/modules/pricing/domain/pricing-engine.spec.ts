import { readFileSync } from 'fs';
import { join } from 'path';
import { DomainError } from '../../../common/errors/domain-error';
import { Catalog } from '../../menu/domain/catalog';
import { normalizeMenu } from '../../menu/domain/menu-normalizer';
import { Cart, CartItem, PricingEngine } from './pricing-engine';

const { catalog } = normalizeMenu(
  JSON.parse(
    readFileSync(join(__dirname, '../../../../../datos/menu.json'), 'utf8'),
  ),
);
const OCT_30_NOON_GT = new Date('2026-10-30T18:00:00Z');

const cart = (items: CartItem[], extra: Partial<Cart> = {}): Cart => ({
  channel: 'MOSTRADOR',
  items,
  ...extra,
});
const product = (
  sku: string,
  quantity = 1,
  modifiers: string[] = [],
): CartItem => ({ type: 'PRODUCT', sku, quantity, modifiers });
const combo = (
  sku: string,
  quantity = 1,
  upgradeLarge = false,
  modifiers: string[] = [],
): CartItem => ({ type: 'COMBO', sku, quantity, upgradeLarge, modifiers });

function quote(c: Cart, now = OCT_30_NOON_GT, source: Catalog = catalog) {
  return new PricingEngine(source).quote(c, now);
}

function expectError(fn: () => unknown, code: string) {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(DomainError);
    expect((error as DomainError).code).toBe(code);
    return;
  }
  throw new Error(`expected ${code}`);
}

describe('PricingEngine', () => {
  it('sums three units of Q29.90 to exactly Q89.70', () => {
    const q = quote(cart([product('P-004', 3)]));
    expect(q.subtotalCents).toBe(8970);
    expect(q.totalCents).toBe(8970);
  });

  it('prices a combo with large upgrade and modifiers per line', () => {
    const q = quote(cart([combo('C-001', 2, true, ['M-01', 'M-02'])]));
    expect(q.lines[0]).toMatchObject({
      unitPriceCents: 6000,
      lineTotalCents: 14500,
    });
  });

  it('breaks down tax so base plus tax equals the total', () => {
    const q = quote(cart([product('P-002'), product('P-004', 2)]));
    expect(q.taxBaseCents + q.taxCents).toBe(q.totalCents);
    expect(q.taxBaseCents).toBe(Math.round((q.totalCents * 100) / 112));
  });

  it.each([
    [product('X-999'), 'PRODUCT_NOT_FOUND'],
    [product('P-009'), 'PRODUCT_UNAVAILABLE'],
    [product('P-015'), 'PRODUCT_UNAVAILABLE'],
    [combo('C-999'), 'COMBO_NOT_FOUND'],
    [combo('C-004'), 'COMBO_UNAVAILABLE'],
    [product('P-001', 1, ['M-99']), 'MODIFIER_NOT_FOUND'],
    [product('P-001', 1, ['M-04']), 'MODIFIER_UNAVAILABLE'],
    [product('P-003', 1, ['M-02']), 'MODIFIER_NOT_APPLICABLE'],
    [combo('C-003', 1, false, ['M-02']), 'MODIFIER_NOT_APPLICABLE'],
    [product('P-005', 1, ['M-01']), 'MODIFIER_NOT_APPLICABLE'],
    [{ ...product('P-001'), upgradeLarge: true }, 'UPGRADE_NOT_AVAILABLE'],
    [product('P-001', 0), 'QUANTITY_OUT_OF_RANGE'],
    [product('P-001', 21), 'QUANTITY_OUT_OF_RANGE'],
  ])('rejects %j with %s', (item, code) => {
    expectError(() => quote(cart([item])), code);
  });

  it('enforces the 30 items per order limit and accepts exactly 30', () => {
    expect(
      quote(cart([product('P-007', 20), product('P-008', 10)])).lines,
    ).toHaveLength(2);
    expectError(
      () => quote(cart([product('P-007', 20), product('P-008', 11)])),
      'ORDER_ITEM_LIMIT_EXCEEDED',
    );
  });

  it('rejects an empty order', () => {
    expectError(() => quote(cart([])), 'EMPTY_ORDER');
  });

  describe('coupons', () => {
    it('applies a percentage only to the discountable base, ignoring case', () => {
      const q = quote(
        cart([combo('C-002', 1, false, ['M-02']), product('P-001')], {
          couponCode: ' combo15 ',
        }),
      );
      expect(q.subtotalCents).toBe(10350);
      expect(q.discountCents).toBe(1440);
      expect(q.totalCents).toBe(8910);
      expect(q.coupon?.code).toBe('COMBO15');
    });

    it('rejects when the minimum is not met', () => {
      expectError(
        () => quote(cart([product('P-001')], { couponCode: 'COMBO15' })),
        'COUPON_MINIMUM_NOT_MET',
      );
    });

    it('rejects an expired coupon and unknown codes', () => {
      expectError(
        () => quote(cart([product('P-001')], { couponCode: 'FERIA10' })),
        'COUPON_EXPIRED',
      );
      expectError(
        () => quote(cart([product('P-001')], { couponCode: 'NOPE' })),
        'COUPON_NOT_FOUND',
      );
    });

    it('treats validity as inclusive until 23:59:59 Guatemala time', () => {
      const items = [combo('C-002', 2)];
      expect(
        quote(
          cart(items, { couponCode: 'COMBO15' }),
          new Date('2026-11-01T05:59:59Z'),
        ).discountCents,
      ).toBe(1920);
      expectError(
        () =>
          quote(
            cart(items, { couponCode: 'COMBO15' }),
            new Date('2026-11-01T06:00:00Z'),
          ),
        'COUPON_EXPIRED',
      );
    });

    it('does not discount the delivery fee', () => {
      const q = quote(
        cart([product('P-001', 3)], {
          channel: 'DOMICILIO',
          couponCode: 'FIJO20',
        }),
      );
      expect(q).toMatchObject({
        subtotalCents: 9600,
        discountCents: 2000,
        deliveryFeeCents: 1500,
        totalCents: 9100,
      });
    });

    it('caps a fixed discount at the discountable base so the total is never negative', () => {
      const generous: Catalog = {
        ...catalog,
        coupons: [
          {
            code: 'GIFT',
            type: 'MONTO',
            value: 100_000,
            minimumCents: 0,
            validFrom: '2026-01-01',
            validTo: '2026-12-31',
            active: true,
          },
        ],
      };
      const q = quote(
        cart([product('P-001', 1, ['M-02'])], { couponCode: 'GIFT' }),
        OCT_30_NOON_GT,
        generous,
      );
      expect(q.discountCents).toBe(3200);
      expect(q.totalCents).toBe(750);
    });
  });
});
