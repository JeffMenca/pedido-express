import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type AuditAction =
  | 'CASH_PAYMENT_CONFIRMED'
  | 'ORDER_CANCELLED'
  | 'REFUND_SUCCEEDED'
  | 'REFUND_FAILED'
  | 'CASH_REFUND_RECORDED';

@Entity('audit_log')
export class AuditLogEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'varchar' }) action: AuditAction;
  @Index() @Column({ name: 'order_id', type: 'uuid' }) orderId: string;
  @Column({ name: 'actor_id', type: 'varchar' }) actorId: string;
  @Column({ name: 'actor_username', type: 'varchar' }) actorUsername: string;
  @Column({ name: 'actor_role', type: 'varchar' }) actorRole: string;
  @Column({ type: 'varchar', nullable: true }) reason: string | null;
  @Column({ type: 'jsonb', nullable: true }) data: Record<
    string,
    unknown
  > | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
