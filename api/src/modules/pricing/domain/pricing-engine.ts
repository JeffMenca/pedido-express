import { DomainError } from '../../../common/errors/domain-error';
import { Money } from '../../../common/money/money';
import {
  Catalog,
  Combo,
  Coupon,
  Modifier,
  Product,
  isComboSellable,
  isProductSellable,
} from '../../menu/domain/catalog';

export const CHANNELS = [
  'MOSTRADOR',
  'KIOSKO',
  'AUTOSERVICIO',
  'DOMICILIO',
] as const;
export type Channel = (typeof CHANNELS)[number];

export type ItemType = 'PRODUCT' | 'COMBO';

export interface CartItem {
  type: ItemType;
  sku: string;
  quantity: number;
  upgradeLarge?: boolean;
  modifiers?: string[];
}

export interface Cart {
  channel: Channel;
  items: CartItem[];
  couponCode?: string;
}

export interface QuoteLine {
  type: ItemType;
  sku: string;
  name: string;
  quantity: number;
  unitPriceCents: number;
  upgradeLarge: boolean;
  modifiers: { code: string; name: string; priceCents: number }[];
  lineTotalCents: number;
}

export interface Quote {
  lines: QuoteLine[];
  subtotalCents: number;
  discountCents: number;
  coupon: { code: string; type: Coupon['type']; value: number } | null;
  deliveryFeeCents: number;
  totalCents: number;
  taxBaseCents: number;
  taxCents: number;
}

const GUATEMALA_UTC_OFFSET_MS = -6 * 60 * 60 * 1000;

const guatemalaDate = (instant: Date): string =>
  new Date(instant.getTime() + GUATEMALA_UTC_OFFSET_MS)
    .toISOString()
    .slice(0, 10);

export class PricingEngine {
  private readonly products: ReadonlyMap<string, Product>;
  private readonly combos: ReadonlyMap<string, Combo>;
  private readonly modifiers: ReadonlyMap<string, Modifier>;
  private readonly coupons: ReadonlyMap<string, Coupon>;

  constructor(private readonly catalog: Catalog) {
    this.products = new Map(catalog.products.map((p) => [p.sku, p]));
    this.combos = new Map(catalog.combos.map((c) => [c.sku, c]));
    this.modifiers = new Map(catalog.modifiers.map((m) => [m.code, m]));
    this.coupons = new Map(catalog.coupons.map((c) => [c.code, c]));
  }

  quote(cart: Cart, now: Date): Quote {
    this.assertQuantities(cart.items);
    const lines = cart.items.map((item) => this.priceLine(item));

    const subtotalCents = lines.reduce(
      (sum, line) => sum + line.lineTotalCents,
      0,
    );
    // Paid modifiers are not discountable (RN-08); the combo upgrade is part of the unit price (RN-02).
    const discountableCents = lines.reduce(
      (sum, line) => sum + Money.multiply(line.unitPriceCents, line.quantity),
      0,
    );

    const coupon = cart.couponCode
      ? this.resolveCoupon(cart.couponCode, subtotalCents, now)
      : null;
    const discountCents = coupon
      ? this.discountFor(coupon, discountableCents)
      : 0;
    const deliveryFeeCents =
      cart.channel === 'DOMICILIO'
        ? this.catalog.parameters.deliveryFeeCents
        : 0;
    const totalCents = subtotalCents - discountCents + deliveryFeeCents;
    const taxBaseCents = Money.taxBaseFromInclusive(
      totalCents,
      this.catalog.parameters.taxRateBasisPoints,
    );

    return {
      lines,
      subtotalCents,
      discountCents,
      coupon: coupon
        ? { code: coupon.code, type: coupon.type, value: coupon.value }
        : null,
      deliveryFeeCents,
      totalCents,
      taxBaseCents,
      taxCents: totalCents - taxBaseCents,
    };
  }

  private assertQuantities(items: CartItem[]): void {
    if (items.length === 0)
      throw new DomainError('EMPTY_ORDER', 'The order has no items');
    const { maxQuantityPerLine, maxItemsPerOrder } = this.catalog.parameters;
    for (const item of items) {
      if (
        !Number.isInteger(item.quantity) ||
        item.quantity < 1 ||
        item.quantity > maxQuantityPerLine
      ) {
        throw new DomainError(
          'QUANTITY_OUT_OF_RANGE',
          `Quantity must be between 1 and ${maxQuantityPerLine}`,
          {
            sku: item.sku,
            quantity: item.quantity,
          },
        );
      }
    }
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    if (totalItems > maxItemsPerOrder) {
      throw new DomainError(
        'ORDER_ITEM_LIMIT_EXCEEDED',
        `An order allows at most ${maxItemsPerOrder} items`,
        { totalItems },
      );
    }
  }

  private priceLine(item: CartItem): QuoteLine {
    const { name, unitPriceCents, category } =
      item.type === 'COMBO'
        ? this.resolveCombo(item)
        : this.resolveProduct(item);
    const modifiers = (item.modifiers ?? []).map((code) =>
      this.resolveModifier(code, category, item.sku),
    );
    const modifiersCents = modifiers.reduce((sum, m) => sum + m.priceCents, 0);
    return {
      type: item.type,
      sku: item.sku,
      name,
      quantity: item.quantity,
      unitPriceCents,
      upgradeLarge: item.type === 'COMBO' && !!item.upgradeLarge,
      modifiers: modifiers.map(({ code, name: modifierName, priceCents }) => ({
        code,
        name: modifierName,
        priceCents,
      })),
      lineTotalCents: Money.multiply(
        unitPriceCents + modifiersCents,
        item.quantity,
      ),
    };
  }

  private resolveProduct(item: CartItem) {
    const product = this.products.get(item.sku);
    if (!product)
      throw new DomainError(
        'PRODUCT_NOT_FOUND',
        `Product ${item.sku} does not exist`,
        { sku: item.sku },
      );
    if (!isProductSellable(product)) {
      throw new DomainError(
        'PRODUCT_UNAVAILABLE',
        `Product ${item.sku} is not available`,
        { sku: item.sku },
      );
    }
    if (item.upgradeLarge) {
      throw new DomainError(
        'UPGRADE_NOT_AVAILABLE',
        'Large upgrade only applies to combos',
        { sku: item.sku },
      );
    }
    return {
      name: product.name,
      unitPriceCents: product.priceCents,
      category: product.category,
    };
  }

  private resolveCombo(item: CartItem) {
    const combo = this.combos.get(item.sku);
    if (!combo)
      throw new DomainError(
        'COMBO_NOT_FOUND',
        `Combo ${item.sku} does not exist`,
        { sku: item.sku },
      );
    if (!isComboSellable(combo, this.products)) {
      throw new DomainError(
        'COMBO_UNAVAILABLE',
        `Combo ${item.sku} is not available`,
        { sku: item.sku, mainSku: combo.mainSku },
      );
    }
    if (item.upgradeLarge && !combo.upgrade) {
      throw new DomainError(
        'UPGRADE_NOT_AVAILABLE',
        `Combo ${item.sku} has no large upgrade`,
        { sku: item.sku },
      );
    }
    const upgradeCents =
      item.upgradeLarge && combo.upgrade ? combo.upgrade.priceCents : 0;
    const main = this.products.get(combo.mainSku) as Product;
    return {
      name: combo.name,
      unitPriceCents: combo.priceCents + upgradeCents,
      category: main.category,
    };
  }

  private resolveModifier(
    code: string,
    category: string,
    sku: string,
  ): Modifier {
    const modifier = this.modifiers.get(code);
    if (!modifier)
      throw new DomainError(
        'MODIFIER_NOT_FOUND',
        `Modifier ${code} does not exist`,
        { code },
      );
    if (!modifier.active)
      throw new DomainError(
        'MODIFIER_UNAVAILABLE',
        `Modifier ${code} is not available`,
        { code },
      );
    if (!modifier.appliesTo.includes(category)) {
      throw new DomainError(
        'MODIFIER_NOT_APPLICABLE',
        `Modifier ${code} does not apply to ${sku}`,
        { code, sku, category },
      );
    }
    return modifier;
  }

  private resolveCoupon(
    rawCode: string,
    subtotalCents: number,
    now: Date,
  ): Coupon {
    const code = rawCode.trim().toUpperCase();
    const coupon = this.coupons.get(code);
    if (!coupon)
      throw new DomainError(
        'COUPON_NOT_FOUND',
        `Coupon ${code} does not exist`,
        { code },
      );
    if (!coupon.active)
      throw new DomainError('COUPON_INACTIVE', `Coupon ${code} is not active`, {
        code,
      });
    const today = guatemalaDate(now);
    if (today < coupon.validFrom || today > coupon.validTo) {
      throw new DomainError(
        'COUPON_EXPIRED',
        `Coupon ${code} is not valid on ${today}`,
        {
          code,
          validFrom: coupon.validFrom,
          validTo: coupon.validTo,
        },
      );
    }
    if (subtotalCents < coupon.minimumCents) {
      throw new DomainError(
        'COUPON_MINIMUM_NOT_MET',
        `Coupon ${code} requires a minimum of ${Money.format(coupon.minimumCents)}`,
        {
          code,
          minimumCents: coupon.minimumCents,
          subtotalCents,
        },
      );
    }
    return coupon;
  }

  private discountFor(coupon: Coupon, discountableCents: number): number {
    const raw =
      coupon.type === 'PORCENTAJE'
        ? Money.percentOf(discountableCents, coupon.value)
        : coupon.value;
    return Math.min(raw, discountableCents);
  }
}
