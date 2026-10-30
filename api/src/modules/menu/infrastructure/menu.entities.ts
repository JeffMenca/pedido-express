import { Column, Entity, PrimaryColumn } from 'typeorm';
import { ComboUpgrade, CouponType } from '../domain/catalog';

@Entity('products')
export class ProductEntity {
  @PrimaryColumn() sku: string;
  @Column() name: string;
  @Column() category: string;
  @Column({ name: 'price_cents', type: 'integer' }) priceCents: number;
  @Column() available: boolean;
  @Column() active: boolean;
}

@Entity('combos')
export class ComboEntity {
  @PrimaryColumn() sku: string;
  @Column() name: string;
  @Column({ name: 'main_sku' }) mainSku: string;
  @Column({ name: 'price_cents', type: 'integer' }) priceCents: number;
  @Column({ name: 'side_skus', type: 'text', array: true }) sideSkus: string[];
  @Column({ name: 'drink_skus', type: 'text', array: true })
  drinkSkus: string[];
  @Column({ type: 'jsonb', nullable: true }) upgrade: ComboUpgrade | null;
  @Column() active: boolean;
}

@Entity('modifiers')
export class ModifierEntity {
  @PrimaryColumn() code: string;
  @Column() name: string;
  @Column({ name: 'price_cents', type: 'integer' }) priceCents: number;
  @Column() active: boolean;
  @Column({ name: 'applies_to', type: 'text', array: true })
  appliesTo: string[];
}

@Entity('coupons')
export class CouponEntity {
  @PrimaryColumn() code: string;
  @Column({ type: 'varchar' }) type: CouponType;
  @Column({ type: 'integer' }) value: number;
  @Column({ name: 'minimum_cents', type: 'integer' }) minimumCents: number;
  @Column({ name: 'valid_from', type: 'date' }) validFrom: string;
  @Column({ name: 'valid_to', type: 'date' }) validTo: string;
  @Column() active: boolean;
}

@Entity('pricing_parameters')
export class PricingParametersEntity {
  @PrimaryColumn({ type: 'integer', default: 1 }) id: number;
  @Column({ name: 'tax_rate_basis_points', type: 'integer' })
  taxRateBasisPoints: number;
  @Column({ name: 'delivery_fee_cents', type: 'integer' })
  deliveryFeeCents: number;
  @Column({ name: 'max_quantity_per_line', type: 'integer' })
  maxQuantityPerLine: number;
  @Column({ name: 'max_items_per_order', type: 'integer' })
  maxItemsPerOrder: number;
}

export const MENU_ENTITIES = [
  ProductEntity,
  ComboEntity,
  ModifierEntity,
  CouponEntity,
  PricingParametersEntity,
];
