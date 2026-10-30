export interface Product {
  sku: string;
  name: string;
  category: string;
  priceCents: number;
  available: boolean;
  active: boolean;
}

export interface ComboUpgrade {
  priceCents: number;
  sideSku: string;
  drinkSku: string;
}

export interface Combo {
  sku: string;
  name: string;
  mainSku: string;
  priceCents: number;
  sideSkus: string[];
  drinkSkus: string[];
  upgrade: ComboUpgrade | null;
  active: boolean;
}

export interface Modifier {
  code: string;
  name: string;
  priceCents: number;
  active: boolean;
  appliesTo: string[];
}

export type CouponType = 'PORCENTAJE' | 'MONTO';

export interface Coupon {
  code: string;
  type: CouponType;
  /** Basis points for PORCENTAJE (1500 = 15 %), cents for MONTO. */
  value: number;
  minimumCents: number;
  validFrom: string;
  validTo: string;
  active: boolean;
}

export interface PricingParameters {
  taxRateBasisPoints: number;
  deliveryFeeCents: number;
  maxQuantityPerLine: number;
  maxItemsPerOrder: number;
}

export interface Catalog {
  products: Product[];
  combos: Combo[];
  modifiers: Modifier[];
  coupons: Coupon[];
  parameters: PricingParameters;
}

export const isProductSellable = (product: Product): boolean =>
  product.active && product.available;

export function isComboSellable(
  combo: Combo,
  productsBySku: ReadonlyMap<string, Product>,
): boolean {
  const main = productsBySku.get(combo.mainSku);
  const components = [...combo.sideSkus, ...combo.drinkSkus];
  return (
    combo.active &&
    !!main &&
    isProductSellable(main) &&
    components.every((sku) => productsBySku.has(sku))
  );
}
