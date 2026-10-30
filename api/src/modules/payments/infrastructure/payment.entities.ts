import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

export type { PaymentAttemptStatus } from '../domain/card-payment-policy';
import type { PaymentAttemptStatus } from '../domain/card-payment-policy';
export type RefundStatus = 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'RECORDED';

@Entity('payment_attempts')
@Unique('uq_payment_attempt_client_key', ['orderId', 'clientKey'])
// At most one live or successful charge per order: the database is the last line of defence against double charging.
@Index('uq_payment_attempt_one_active_per_order', ['orderId'], {
  unique: true,
  where: `status IN ('PROCESSING', 'SUCCEEDED')`,
})
export class PaymentAttemptEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'order_id', type: 'uuid' }) orderId: string;
  @Column({ name: 'client_key' }) clientKey: string;
  @Column({ name: 'request_hash' }) requestHash: string;
  @Column({ type: 'varchar' }) status: PaymentAttemptStatus;
  @Column({ name: 'amount_cents', type: 'integer' }) amountCents: number;
  @Column({ name: 'charge_id', type: 'varchar', nullable: true }) chargeId:
    string | null;
  @Column({ name: 'card_last4', type: 'varchar', length: 4 }) cardLast4: string;
  @Column({ name: 'decline_code', type: 'varchar', nullable: true })
  declineCode: string | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

@Entity('webhook_events')
export class WebhookEventEntity {
  @PrimaryColumn({ name: 'event_id' }) eventId: string;
  @Column() type: string;
  @Column({ type: 'jsonb' }) payload: unknown;
  @CreateDateColumn({ name: 'received_at', type: 'timestamptz' })
  receivedAt: Date;
}

@Entity('refunds')
export class RefundEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'order_id', type: 'uuid', unique: true }) orderId: string;
  @Column({ type: 'varchar' }) method: 'TARJETA' | 'EFECTIVO';
  @Column({ type: 'varchar' }) status: RefundStatus;
  @Column({ name: 'amount_cents', type: 'integer' }) amountCents: number;
  @Column({ name: 'gateway_refund_id', type: 'varchar', nullable: true })
  gatewayRefundId: string | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

export const PAYMENT_ENTITIES = [
  PaymentAttemptEntity,
  WebhookEventEntity,
  RefundEntity,
];
