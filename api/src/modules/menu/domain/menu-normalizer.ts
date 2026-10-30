import { Money } from '../../../common/money/money';
import {
  Catalog,
  Combo,
  Coupon,
  CouponType,
  Modifier,
  PricingParameters,
  Product,
  isComboSellable,
} from './catalog';

export type NormalizationAction = 'DISCARDED' | 'CORRECTED' | 'NOT_SELLABLE';

export interface NormalizationEntry {
  entity: 'product' | 'combo' | 'modifier' | 'coupon' | 'parameters';
  key: string;
  action: NormalizationAction;
  reason: string;
  detail?: string;
}

export interface NormalizationResult {
  catalog: Catalog;
  report: NormalizationEntry[];
}

type RawRecord = Record<string, unknown>;
type PriceResult =
  | { ok: true; cents: number; corrected: boolean }
  | { ok: false; reason: string };

const asRecords = (value: unknown): RawRecord[] =>
  Array.isArray(value)
    ? value.filter((v): v is RawRecord => typeof v === 'object' && v !== null)
    : [];

const asText = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const asStringList = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((v): v is string => typeof v === 'string')
    : [];

function readPrice(value: unknown): PriceResult {
  if (
    value === null ||
    value === undefined ||
    (typeof value === 'string' && value.trim() === '')
  ) {
    return { ok: false, reason: 'EMPTY_PRICE' };
  }
  if (typeof value === 'number' && value < 0)
    return { ok: false, reason: 'NEGATIVE_PRICE' };
  const cents = Money.tryParse(value);
  if (cents === null) return { ok: false, reason: 'INVALID_PRICE' };
  return { ok: true, cents, corrected: typeof value === 'string' };
}

class MenuNormalizer {
  private readonly report: NormalizationEntry[] = [];

  normalize(raw: unknown): NormalizationResult {
    const source = (
      typeof raw === 'object' && raw !== null ? raw : {}
    ) as RawRecord;
    const parameters = this.normalizeParameters(source.parametros);
    const products = this.normalizeProducts(asRecords(source.productos));
    const productsBySku = new Map(products.map((p) => [p.sku, p]));
    const combos = this.normalizeCombos(
      asRecords(source.combos),
      productsBySku,
    );
    const modifiers = this.normalizeModifiers(asRecords(source.modificadores));
    const coupons = this.normalizeCoupons(asRecords(source.cupones));
    return {
      catalog: { products, combos, modifiers, coupons, parameters },
      report: this.report,
    };
  }

  private log(entry: NormalizationEntry): void {
    this.report.push(entry);
  }

  private normalizeParameters(raw: unknown): PricingParameters {
    const p = (raw ?? {}) as RawRecord;
    const deliveryFeeCents = Money.tryParse(p.cargoDomicilio);
    const taxRate = Money.tryParse(p.ivaPorcentaje);
    const maxQuantityPerLine = Number(p.maxCantidadPorLinea);
    const maxItemsPerOrder = Number(p.maxArticulosPorOrden);
    if (
      deliveryFeeCents === null ||
      taxRate === null ||
      !Number.isInteger(maxQuantityPerLine) ||
      !Number.isInteger(maxItemsPerOrder) ||
      p.preciosIncluyenIva !== true
    ) {
      throw new Error(
        'menu.json parametros are incomplete or invalid; refusing to load without safe defaults',
      );
    }
    return {
      taxRateBasisPoints: taxRate,
      deliveryFeeCents,
      maxQuantityPerLine,
      maxItemsPerOrder,
    };
  }

  private normalizeProducts(records: RawRecord[]): Product[] {
    const seen = new Set<string>();
    const products: Product[] = [];
    for (const r of records) {
      const sku = asText(r.sku);
      const name = asText(r.nombre);
      if (!sku) {
        this.log({
          entity: 'product',
          key: '(sin sku)',
          action: 'DISCARDED',
          reason: 'EMPTY_KEY',
        });
        continue;
      }
      if (seen.has(sku)) {
        this.log({
          entity: 'product',
          key: sku,
          action: 'DISCARDED',
          reason: 'DUPLICATE_KEY',
          detail: `kept first occurrence; dropped "${name}"`,
        });
        continue;
      }
      seen.add(sku);
      if (!name) {
        this.log({
          entity: 'product',
          key: sku,
          action: 'DISCARDED',
          reason: 'EMPTY_NAME',
        });
        continue;
      }
      const price = readPrice(r.precio);
      if (!price.ok) {
        this.log({
          entity: 'product',
          key: sku,
          action: 'DISCARDED',
          reason: price.reason,
          detail: `precio=${JSON.stringify(r.precio)}`,
        });
        continue;
      }
      if (price.corrected) {
        this.log({
          entity: 'product',
          key: sku,
          action: 'CORRECTED',
          reason: 'PRICE_AS_TEXT',
          detail: `${JSON.stringify(r.precio)} -> ${price.cents} cents`,
        });
      }
      const product: Product = {
        sku,
        name,
        category: asText(r.categoria).toUpperCase(),
        priceCents: price.cents,
        available: r.disponible === true,
        active: r.activo === true,
      };
      if (!product.active)
        this.log({
          entity: 'product',
          key: sku,
          action: 'NOT_SELLABLE',
          reason: 'INACTIVE',
        });
      else if (!product.available)
        this.log({
          entity: 'product',
          key: sku,
          action: 'NOT_SELLABLE',
          reason: 'UNAVAILABLE',
        });
      products.push(product);
    }
    return products;
  }

  private normalizeCombos(
    records: RawRecord[],
    productsBySku: ReadonlyMap<string, Product>,
  ): Combo[] {
    const seen = new Set<string>();
    const combos: Combo[] = [];
    for (const r of records) {
      const sku = asText(r.sku);
      const name = asText(r.nombre);
      if (!sku || seen.has(sku)) {
        this.log({
          entity: 'combo',
          key: sku || '(sin sku)',
          action: 'DISCARDED',
          reason: sku ? 'DUPLICATE_KEY' : 'EMPTY_KEY',
        });
        continue;
      }
      seen.add(sku);
      if (!name) {
        this.log({
          entity: 'combo',
          key: sku,
          action: 'DISCARDED',
          reason: 'EMPTY_NAME',
        });
        continue;
      }
      const price = readPrice(r.precio);
      if (!price.ok) {
        this.log({
          entity: 'combo',
          key: sku,
          action: 'DISCARDED',
          reason: price.reason,
          detail: `precio=${JSON.stringify(r.precio)}`,
        });
        continue;
      }
      if (price.corrected) {
        this.log({
          entity: 'combo',
          key: sku,
          action: 'CORRECTED',
          reason: 'PRICE_AS_TEXT',
          detail: `${JSON.stringify(r.precio)} -> ${price.cents} cents`,
        });
      }
      const combo: Combo = {
        sku,
        name,
        mainSku: asText(r.principal),
        priceCents: price.cents,
        sideSkus: asStringList(r.acompanamientos),
        drinkSkus: asStringList(r.bebidas),
        upgrade: this.normalizeUpgrade(sku, r.upgradeGrande),
        active: r.activo === true,
      };
      if (!isComboSellable(combo, productsBySku)) {
        const main = productsBySku.get(combo.mainSku);
        const reason = !combo.active
          ? 'INACTIVE'
          : !main || !main.active || !main.available
            ? 'MAIN_PRODUCT_NOT_SELLABLE'
            : 'COMPONENT_NOT_FOUND';
        this.log({
          entity: 'combo',
          key: sku,
          action: 'NOT_SELLABLE',
          reason,
          detail: `principal=${combo.mainSku}`,
        });
      }
      combos.push(combo);
    }
    return combos;
  }

  private normalizeUpgrade(comboSku: string, raw: unknown): Combo['upgrade'] {
    if (raw === null || raw === undefined) return null;
    const r = raw as RawRecord;
    const price = readPrice(r.precio);
    if (!price.ok) {
      this.log({
        entity: 'combo',
        key: comboSku,
        action: 'CORRECTED',
        reason: `UPGRADE_${price.reason}`,
        detail: 'upgrade removed',
      });
      return null;
    }
    if (price.corrected) {
      this.log({
        entity: 'combo',
        key: comboSku,
        action: 'CORRECTED',
        reason: 'UPGRADE_PRICE_AS_TEXT',
        detail: `${JSON.stringify(r.precio)} -> ${price.cents} cents`,
      });
    }
    return {
      priceCents: price.cents,
      sideSku: asText(r.acompanamiento),
      drinkSku: asText(r.bebida),
    };
  }

  private normalizeModifiers(records: RawRecord[]): Modifier[] {
    const seen = new Set<string>();
    const modifiers: Modifier[] = [];
    for (const r of records) {
      const code = asText(r.codigo);
      const name = asText(r.nombre);
      if (!code || seen.has(code)) {
        this.log({
          entity: 'modifier',
          key: code || '(sin código)',
          action: 'DISCARDED',
          reason: code ? 'DUPLICATE_KEY' : 'EMPTY_KEY',
        });
        continue;
      }
      seen.add(code);
      if (!name) {
        this.log({
          entity: 'modifier',
          key: code,
          action: 'DISCARDED',
          reason: 'EMPTY_NAME',
        });
        continue;
      }
      const price = readPrice(r.precio);
      if (!price.ok) {
        this.log({
          entity: 'modifier',
          key: code,
          action: 'DISCARDED',
          reason: price.reason,
          detail: `precio=${JSON.stringify(r.precio)}`,
        });
        continue;
      }
      if (price.corrected) {
        this.log({
          entity: 'modifier',
          key: code,
          action: 'CORRECTED',
          reason: 'PRICE_AS_TEXT',
          detail: `${JSON.stringify(r.precio)} -> ${price.cents} cents`,
        });
      }
      const modifier: Modifier = {
        code,
        name,
        priceCents: price.cents,
        active: r.activo === true,
        appliesTo: asStringList(r.aplicaA).map((c) => c.trim().toUpperCase()),
      };
      if (!modifier.active)
        this.log({
          entity: 'modifier',
          key: code,
          action: 'NOT_SELLABLE',
          reason: 'INACTIVE',
        });
      modifiers.push(modifier);
    }
    return modifiers;
  }

  private normalizeCoupons(records: RawRecord[]): Coupon[] {
    const seen = new Set<string>();
    const coupons: Coupon[] = [];
    for (const r of records) {
      const rawCode = asText(r.codigo);
      const code = rawCode.toUpperCase();
      if (!code) {
        this.log({
          entity: 'coupon',
          key: '(sin código)',
          action: 'DISCARDED',
          reason: 'EMPTY_KEY',
        });
        continue;
      }
      if (seen.has(code)) {
        this.log({
          entity: 'coupon',
          key: rawCode,
          action: 'DISCARDED',
          reason: 'DUPLICATE_KEY',
          detail: `same code as ${code} ignoring case`,
        });
        continue;
      }
      const type = asText(r.tipo).toUpperCase();
      if (type !== 'PORCENTAJE' && type !== 'MONTO') {
        this.log({
          entity: 'coupon',
          key: rawCode,
          action: 'DISCARDED',
          reason: 'INVALID_TYPE',
        });
        continue;
      }
      const value = readPrice(r.valor);
      if (!value.ok || value.cents === 0) {
        this.log({
          entity: 'coupon',
          key: rawCode,
          action: 'DISCARDED',
          reason: value.ok ? 'ZERO_VALUE' : `VALUE_${value.reason}`,
        });
        continue;
      }
      const minimum = readPrice(r.minimo ?? 0);
      const validFrom = asText(r.vigenteDesde);
      const validTo = asText(r.vigenteHasta);
      if (
        !minimum.ok ||
        !/^\d{4}-\d{2}-\d{2}$/.test(validFrom) ||
        !/^\d{4}-\d{2}-\d{2}$/.test(validTo)
      ) {
        this.log({
          entity: 'coupon',
          key: rawCode,
          action: 'DISCARDED',
          reason: 'INVALID_TERMS',
        });
        continue;
      }
      seen.add(code);
      if (rawCode !== code) {
        this.log({
          entity: 'coupon',
          key: rawCode,
          action: 'CORRECTED',
          reason: 'CODE_UPPERCASED',
          detail: code,
        });
      }
      // Money.tryParse yields hundredths, which for a percentage are exactly basis points (15 -> 1500).
      coupons.push({
        code,
        type: type as CouponType,
        value: value.cents,
        minimumCents: minimum.cents,
        validFrom,
        validTo,
        active: r.activo === true,
      });
    }
    return coupons;
  }
}

export const normalizeMenu = (raw: unknown): NormalizationResult =>
  new MenuNormalizer().normalize(raw);
