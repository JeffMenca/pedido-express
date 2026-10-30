import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { gatewayConfig } from '../../../common/config/app-config';
import { DomainError } from '../../../common/errors/domain-error';
import {
  AuditActor,
  AuditService,
} from '../../audit/application/audit.service';
import { PaymentGateway } from '../domain/payment-gateway';
import {
  PaymentAttemptEntity,
  RefundEntity,
} from '../infrastructure/payment.entities';

export const SYSTEM_ACTOR: AuditActor = {
  id: 'system',
  username: 'SISTEMA',
  role: 'SISTEMA',
};

/** Executes a pending card refund; safe to call repeatedly thanks to a deterministic idempotency key. */
@Injectable()
export class RefundExecutor {
  private readonly logger = new Logger(RefundExecutor.name);
  private readonly callbackUrl: string;

  constructor(
    private readonly dataSource: DataSource,
    private readonly gateway: PaymentGateway,
    private readonly audit: AuditService,
    config: ConfigService,
  ) {
    this.callbackUrl = gatewayConfig(config).callbackUrl;
  }

  async execute(
    orderId: string,
    actor: AuditActor,
    reason: string,
  ): Promise<void> {
    const refund = await this.dataSource
      .getRepository(RefundEntity)
      .findOneBy({ orderId, method: 'TARJETA' });
    if (!refund || refund.status !== 'PENDING') return;
    const charge = await this.dataSource
      .getRepository(PaymentAttemptEntity)
      .findOneByOrFail({ orderId, status: 'SUCCEEDED' });
    const data = { chargeId: charge.chargeId, amountCents: refund.amountCents };

    try {
      const result = await this.gateway.refund(
        charge.chargeId as string,
        refund.amountCents,
        `refund-${orderId}`,
        this.callbackUrl,
      );
      await this.dataSource.transaction(async (manager) => {
        const updated = await manager
          .getRepository(RefundEntity)
          .update(
            { orderId, status: 'PENDING' },
            { status: 'SUCCEEDED', gatewayRefundId: result.id },
          );
        if (updated.affected) {
          await this.audit.record(manager, {
            action: 'REFUND_SUCCEEDED',
            orderId,
            actor,
            reason,
            data: { ...data, refundId: result.id },
          });
        }
      });
    } catch (error) {
      // Only a definitive rejection is a failure; a timeout or 5xx may have refunded, so it stays PENDING and is retried.
      if (!(error instanceof DomainError)) {
        this.logger.warn(
          { orderId, error },
          'Refund outcome unknown; will retry',
        );
        return;
      }
      await this.dataSource.transaction(async (manager) => {
        await manager
          .getRepository(RefundEntity)
          .update({ orderId }, { status: 'FAILED' });
        await this.audit.record(manager, {
          action: 'REFUND_FAILED',
          orderId,
          actor,
          reason,
          data: { ...data, error: error.message },
        });
      });
    }
  }
}
