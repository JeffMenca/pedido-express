import { Injectable, Logger } from '@nestjs/common';
import { EntityManager, In } from 'typeorm';
import { OrderStateMachine } from '../../orders/domain/order-state-machine';
import { OrderTransitionsService } from '../../orders/application/order-transitions.service';
import { OrderRepository } from '../../orders/infrastructure/order.repository';
import {
  attemptStatusForCharge,
  eventForChargeStatus,
} from '../domain/card-payment-policy';
import { GatewayChargeStatus } from '../domain/payment-gateway';
import { PaymentAttemptEntity } from '../infrastructure/payment.entities';

export interface ChargeOutcome {
  orderId: string;
  chargeId: string;
  status: GatewayChargeStatus;
  declineCode: string | null;
  source: 'WEBHOOK' | 'GATEWAY_RESPONSE' | 'RECONCILIATION';
}

/** Single place where a gateway result changes an order: shared by webhook, synchronous response and reconciliation. */
@Injectable()
export class PaymentOutcomeService {
  private readonly logger = new Logger(PaymentOutcomeService.name);

  constructor(
    private readonly orders: OrderRepository,
    private readonly transitions: OrderTransitionsService,
  ) {}

  async apply(manager: EntityManager, outcome: ChargeOutcome): Promise<void> {
    const order = await this.orders.lockById(manager, outcome.orderId);
    const attempts = manager.getRepository(PaymentAttemptEntity);
    const attempt =
      (await attempts.findOneBy({
        orderId: order.id,
        chargeId: outcome.chargeId,
      })) ??
      (await attempts.findOne({
        where: { orderId: order.id, status: In(['PROCESSING']) },
        order: { createdAt: 'DESC' },
      }));
    if (!attempt) {
      this.logger.warn(
        { ...outcome },
        'Charge outcome without a matching attempt; ignored',
      );
      return;
    }

    const event = eventForChargeStatus(outcome.status);

    // Only the live attempt may move the order: a late result for an older, settled charge must not override a retry.
    if (attempt.status !== 'PROCESSING') {
      if (!attempt.chargeId)
        await attempts.update(attempt.id, { chargeId: outcome.chargeId });
      this.flagUnexpectedSuccess(outcome, attempt.status, order.status);
      return;
    }

    await attempts.update(attempt.id, {
      chargeId: outcome.chargeId,
      status: attemptStatusForCharge(outcome.status),
      declineCode: outcome.declineCode,
    });

    if (!event) return;
    if (!OrderStateMachine.can(order.status, event)) {
      this.flagUnexpectedSuccess(outcome, 'PROCESSING', order.status);
      return;
    }
    await this.transitions.apply(
      manager,
      order,
      event,
      'SISTEMA',
      outcome.source,
    );
  }

  private flagUnexpectedSuccess(
    outcome: ChargeOutcome,
    attemptStatus: string,
    orderStatus: string,
  ): void {
    if (
      eventForChargeStatus(outcome.status) !== 'PAYMENT_CONFIRMED' ||
      attemptStatus === 'SUCCEEDED'
    )
      return;
    this.logger.error(
      { ...outcome, attemptStatus, orderStatus },
      'Charge succeeded but the order cannot accept it; manual refund required',
    );
  }
}
