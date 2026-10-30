import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, LessThan } from 'typeorm';
import { OrderTransitionsService } from '../../orders/application/order-transitions.service';
import { OrderRepository } from '../../orders/infrastructure/order.repository';
import { eventForChargeStatus } from '../domain/card-payment-policy';
import { GatewayCharge, PaymentGateway } from '../domain/payment-gateway';
import {
  PaymentAttemptEntity,
  RefundEntity,
} from '../infrastructure/payment.entities';
import { RefundExecutor, SYSTEM_ACTOR } from './refund-executor';
import { PaymentOutcomeService } from './payment-outcome.service';

const MIN_ATTEMPT_AGE_MS = 8_000;
/** If the processor still has no charge for the reference after this long, the charge was never created. */
const NOT_FOUND_GRACE_MS = 60_000;

@Injectable()
export class ReconciliationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ReconciliationService.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    private readonly dataSource: DataSource,
    private readonly gateway: PaymentGateway,
    private readonly outcomes: PaymentOutcomeService,
    private readonly orders: OrderRepository,
    private readonly transitions: OrderTransitionsService,
    private readonly config: ConfigService,
    private readonly refunds: RefundExecutor,
  ) {}

  onModuleInit(): void {
    if (this.config.get('NODE_ENV') === 'test') return;
    this.timer = setInterval(
      () => void this.run(),
      this.config.getOrThrow<number>('RECONCILIATION_INTERVAL_MS'),
    );
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async run(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const stale = await this.dataSource
        .getRepository(PaymentAttemptEntity)
        .find({
          where: {
            status: 'PROCESSING',
            createdAt: LessThan(new Date(Date.now() - MIN_ATTEMPT_AGE_MS)),
          },
          order: { createdAt: 'ASC' },
          take: 20,
        });
      for (const attempt of stale) {
        try {
          await this.reconcile(attempt);
        } catch (error) {
          this.logger.error(
            { orderId: attempt.orderId, error },
            'Could not reconcile attempt',
          );
        }
      }
      await this.retryPendingRefunds();
    } catch (error) {
      this.logger.error(error, 'Reconciliation run failed');
    } finally {
      this.running = false;
    }
  }

  private async reconcile(attempt: PaymentAttemptEntity): Promise<void> {
    const charges = await this.gateway.findChargesByReference(attempt.orderId);
    const siblings = await this.dataSource
      .getRepository(PaymentAttemptEntity)
      .findBy({ orderId: attempt.orderId });
    const claimed = new Set(
      siblings
        .filter((a) => a.id !== attempt.id && a.chargeId)
        .map((a) => a.chargeId),
    );
    const charge = this.matchCharge(
      attempt,
      charges.filter((c) => !claimed.has(c.id)),
    );
    if (charge && eventForChargeStatus(charge.status)) {
      await this.dataSource.transaction((manager) =>
        this.outcomes.apply(manager, {
          orderId: attempt.orderId,
          chargeId: charge.id,
          status: charge.status,
          declineCode: charge.declineCode,
          source: 'RECONCILIATION',
        }),
      );
      this.logger.log(
        {
          orderId: attempt.orderId,
          chargeId: charge.id,
          status: charge.status,
        },
        'Payment reconciled',
      );
      return;
    }
    if (
      !charge &&
      Date.now() - attempt.createdAt.getTime() > NOT_FOUND_GRACE_MS
    ) {
      await this.dataSource.transaction(async (manager) => {
        const order = await this.orders.lockById(manager, attempt.orderId);
        const updated = await manager
          .getRepository(PaymentAttemptEntity)
          .update(
            { id: attempt.id, status: 'PROCESSING' },
            { status: 'FAILED', declineCode: 'NOT_FOUND_AT_PROCESSOR' },
          );
        if (!updated.affected) return;
        if (
          order.status === 'PENDIENTE_PAGO' ||
          order.status === 'PAGO_EN_VERIFICACION'
        ) {
          await this.transitions.apply(
            manager,
            order,
            'PAYMENT_DECLINED',
            'SISTEMA',
            'RECONCILIATION',
            'NOT_FOUND_AT_PROCESSOR',
          );
        }
      });
      this.logger.warn(
        { orderId: attempt.orderId },
        'Processor has no charge for this attempt; marked as failed',
      );
    }
  }

  private matchCharge(
    attempt: PaymentAttemptEntity,
    charges: GatewayCharge[],
  ): GatewayCharge | undefined {
    if (attempt.chargeId) return charges.find((c) => c.id === attempt.chargeId);
    // Without a charge id (timeout before the response), the reference + amount identify it; at most one attempt is live per order.
    const candidates = charges.filter((c) => c.amount === attempt.amountCents);
    return (
      candidates.find(
        (c) => eventForChargeStatus(c.status) === 'PAYMENT_CONFIRMED',
      ) ??
      candidates.find((c) => c.status === 'PROCESSING') ??
      candidates[0]
    );
  }

  private async retryPendingRefunds(): Promise<void> {
    const pending = await this.dataSource.getRepository(RefundEntity).find({
      where: {
        method: 'TARJETA',
        status: 'PENDING',
        updatedAt: LessThan(new Date(Date.now() - MIN_ATTEMPT_AGE_MS)),
      },
      take: 20,
    });
    for (const refund of pending) {
      try {
        await this.refunds.execute(
          refund.orderId,
          SYSTEM_ACTOR,
          'Reintento automático de reembolso',
        );
      } catch (error) {
        this.logger.error(
          { orderId: refund.orderId, error },
          'Refund retry failed',
        );
      }
    }
  }
}
