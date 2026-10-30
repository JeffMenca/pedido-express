import {
  Column,
  CreateDateColumn,
  Entity,
  Generated,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  Channel,
  ItemType,
  Quote,
  QuoteLine,
} from '../../pricing/domain/pricing-engine';
import { OrderStatus } from '../domain/order-state-machine';

export type PaymentMethod = 'TARJETA' | 'EFECTIVO';

@Entity('orders')
export class OrderEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'integer', unique: true })
  @Generated('increment')
  number: number;
  @Column({ type: 'varchar' }) channel: Channel;
  @Column({ name: 'payment_method', type: 'varchar' })
  paymentMethod: PaymentMethod;
  @Index() @Column({ type: 'varchar' }) status: OrderStatus;
  @Column({ name: 'subtotal_cents', type: 'integer' }) subtotalCents: number;
  @Column({ name: 'discount_cents', type: 'integer' }) discountCents: number;
  @Column({ type: 'jsonb', nullable: true }) coupon: Quote['coupon'];
  @Column({ name: 'delivery_fee_cents', type: 'integer' })
  deliveryFeeCents: number;
  @Column({ name: 'total_cents', type: 'integer' }) totalCents: number;
  @Column({ name: 'tax_base_cents', type: 'integer' }) taxBaseCents: number;
  @Column({ name: 'tax_cents', type: 'integer' }) taxCents: number;
  @Column({ type: 'jsonb', nullable: true }) delivery: {
    address: string;
    phone: string;
  } | null;
  @Column({
    name: 'idempotency_key',
    type: 'varchar',
    nullable: true,
    unique: true,
  })
  idempotencyKey: string | null;
  @Column({ name: 'request_hash', type: 'varchar', nullable: true })
  requestHash: string | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => OrderLineEntity, (line) => line.order, {
    cascade: ['insert'],
  })
  lines: OrderLineEntity[];
  @OneToMany(() => OrderStatusHistoryEntity, (h) => h.order, {
    cascade: ['insert'],
  })
  history: OrderStatusHistoryEntity[];
}

@Entity('order_lines')
export class OrderLineEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @ManyToOne(() => OrderEntity, (o) => o.lines, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: OrderEntity;
  @Column({ type: 'integer' }) position: number;
  @Column({ type: 'varchar' }) type: ItemType;
  @Column() sku: string;
  @Column() name: string;
  @Column({ type: 'integer' }) quantity: number;
  @Column({ name: 'unit_price_cents', type: 'integer' }) unitPriceCents: number;
  @Column({ name: 'upgrade_large' }) upgradeLarge: boolean;
  @Column({ type: 'jsonb' }) modifiers: QuoteLine['modifiers'];
  @Column({ name: 'line_total_cents', type: 'integer' }) lineTotalCents: number;
}

@Entity('order_status_history')
export class OrderStatusHistoryEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @ManyToOne(() => OrderEntity, (o) => o.history, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: OrderEntity;
  @Column({ name: 'from_status', type: 'varchar', nullable: true })
  fromStatus: OrderStatus | null;
  @Column({ name: 'to_status', type: 'varchar' }) toStatus: OrderStatus;
  @Column() actor: string;
  @Column({ type: 'varchar', nullable: true }) reason: string | null;
  @CreateDateColumn({ type: 'timestamptz' }) at: Date;
}

export const ORDER_ENTITIES = [
  OrderEntity,
  OrderLineEntity,
  OrderStatusHistoryEntity,
];
