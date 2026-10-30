import { createHash } from 'crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { gatewayConfig } from '../../../common/config/app-config';
import { DomainError } from '../../../common/errors/domain-error';
import { OrdersService } from '../../orders/application/orders.service';
import { OrderTransitionsService } from '../../orders/application/order-transitions.service';
import { OrderRepository } from '../../orders/infrastructure/order.repository';
import { decideCardPaymentStart } from '../domain/card-payment-policy';
import { CardData, PaymentGateway } from '../domain/payment-gateway';
import { PaymentAttemptEntity } from '../infrastructure/payment.entities';
import { PaymentOutcomeService } from './payment-outcome.service';

export interface CardPaymentResponse {
  orderId: string;
  status: string;
  payment: { status: string; last4: string; declineCode: string | null };
}

@Injectable()
export class CardPaymentService {
  private readonly callbackUrl: string;

  constructor(
    private readonly dataSource: DataSource,
    private readonly orders: OrderRepository,
    private readonly ordersService: OrdersService,
    private readonly transitions: OrderTransitionsService,
    private readonly outcomes: PaymentOutcomeService,
    private readonly gateway: PaymentGateway,
    config: ConfigService,
  ) {
    this.callbackUrl = gatewayConfig(config).callbackUrl;
  }

  async pay(
    orderId: string,
    clientKey: string,
    card: CardData,
  ): Promise<CardPaymentResponse> {
    await this.ordersService.findById(orderId);
    const last4 = card.number.replace(/\s/g, '').slice(-4);
    // The hash covers only non-sensitive data so we never derive anything from the full PAN.
    const requestHash = createHash('sha256')
      .update(`${last4}|${card.exp}`)
      .digest('hex');

    const start = await this.dataSource.transaction(async (manager) => {
      const order = await this.orders.lockById(manager, orderId);
      const attempts = await manager
        .getRepository(PaymentAttemptEntity)
        .findBy({ orderId });
      const decision = decideCardPaymentStart({
        orderStatus: order.status,
        paymentMethod: order.paymentMethod,
        attempts,
        clientKey,
        requestHash,
      });
      if (decision.kind === 'REPLAY')
        return {
          attemptId: decision.attemptId,
          replay: true,
          amountCents: order.totalCents,
        };
      if (decision.isRetry)
        await this.transitions.apply(
          manager,
          order,
          'PAYMENT_RETRIED',
          'CLIENTE',
          'CLIENTE',
        );
      const attempt = await manager.getRepository(PaymentAttemptEntity).save({
        orderId,
        clientKey,
        requestHash,
        status: 'PROCESSING',
        amountCents: order.totalCents,
        cardLast4: last4,
        chargeId: null,
        declineCode: null,
      });
      return {
        attemptId: attempt.id,
        replay: false,
        amountCents: order.totalCents,
      };
    });

    if (!start.replay)
      await this.charge(orderId, start.attemptId, start.amountCents, card);
    return this.snapshot(orderId, start.attemptId);
  }

  private async charge(
    orderId: string,
    attemptId: string,
    amountCents: number,
    card: CardData,
  ): Promise<void> {
    // The attempt id is the gateway Idempotency-Key, so a replayed request can never create a second charge.
    const result = await this.gateway.createCharge(
      { amountCents, reference: orderId, callbackUrl: this.callbackUrl, card },
      attemptId,
    );

    await this.dataSource.transaction(async (manager) => {
      switch (result.kind) {
        case 'ACCEPTED':
        case 'DECLINED':
          await this.outcomes.apply(manager, {
            orderId,
            chargeId: result.charge.id,
            status: result.charge.status,
            declineCode: result.charge.declineCode,
            source: 'GATEWAY_RESPONSE',
          });
          return;
        case 'UNKNOWN': {
          const order = await this.orders.lockById(manager, orderId);
          // The webhook may have already settled the order (slow-response card); only move it if still pending.
          if (order.status === 'PENDIENTE_PAGO') {
            await this.transitions.apply(
              manager,
              order,
              'PAYMENT_TIMED_OUT',
              'SISTEMA',
              'SISTEMA',
              result.reason,
            );
          }
          return;
        }
        case 'REJECTED':
          await manager
            .getRepository(PaymentAttemptEntity)
            .update(attemptId, { status: 'ERROR', declineCode: result.error });
      }
    });

    if (result.kind === 'REJECTED') {
      throw new DomainError(
        'GATEWAY_ERROR',
        'The payment processor rejected the request',
        { error: result.error },
      );
    }
  }

  private async snapshot(
    orderId: string,
    attemptId: string,
  ): Promise<CardPaymentResponse> {
    const { order } = await this.orders.findAggregate(orderId);
    const attempt = await this.dataSource
      .getRepository(PaymentAttemptEntity)
      .findOneByOrFail({ id: attemptId });
    return {
      orderId,
      status: order.status,
      payment: {
        status: attempt.status,
        last4: attempt.cardLast4,
        declineCode: attempt.declineCode,
      },
    };
  }
}
