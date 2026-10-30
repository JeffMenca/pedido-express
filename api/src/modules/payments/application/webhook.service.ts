import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EntityManager, In } from 'typeorm';
import {
  GatewayConfig,
  gatewayConfig,
} from '../../../common/config/app-config';
import { DomainError } from '../../../common/errors/domain-error';
import { GatewayChargeStatus } from '../domain/payment-gateway';
import { verifyWebhookSignature } from '../domain/webhook-signature';
import { RefundEntity } from '../infrastructure/payment.entities';
import { PaymentOutcomeService } from './payment-outcome.service';
import { InboxResult, WebhookInbox } from './webhook-inbox';

export interface WebhookHeaders {
  timestamp?: string;
  signature?: string;
}

interface GatewayEvent {
  id: string;
  type: 'charge.succeeded' | 'charge.failed' | 'refund.succeeded' | string;
  data: {
    chargeId: string;
    reference: string;
    status?: GatewayChargeStatus;
    declineCode?: string | null;
    refundId?: string;
  };
}

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);
  private readonly config: GatewayConfig;

  constructor(
    private readonly inbox: WebhookInbox,
    private readonly outcomes: PaymentOutcomeService,
    config: ConfigService,
  ) {
    this.config = gatewayConfig(config);
  }

  async handle(
    rawBody: Buffer | undefined,
    headers: WebhookHeaders,
  ): Promise<InboxResult> {
    verifyWebhookSignature({
      rawBody: rawBody ?? Buffer.alloc(0),
      timestampHeader: headers.timestamp,
      signatureHeader: headers.signature,
      secret: this.config.webhookSecret,
      toleranceSeconds: this.config.webhookToleranceSeconds,
      nowSeconds: Math.floor(Date.now() / 1000),
    });
    const event = this.parse(rawBody as Buffer);
    const result = await this.inbox.processOnce(
      { id: event.id, type: event.type, payload: event },
      (manager) => this.dispatch(manager, event),
    );
    this.logger.log(
      {
        eventId: event.id,
        type: event.type,
        reference: event.data.reference,
        result,
      },
      'Webhook handled',
    );
    return result;
  }

  private parse(rawBody: Buffer): GatewayEvent {
    try {
      const event = JSON.parse(rawBody.toString('utf8')) as GatewayEvent;
      if (
        typeof event.id === 'string' &&
        typeof event.type === 'string' &&
        typeof event.data?.reference === 'string'
      )
        return event;
    } catch {
      // falls through to the validation error below
    }
    throw new DomainError('VALIDATION_ERROR', 'Malformed webhook payload');
  }

  private async dispatch(
    manager: EntityManager,
    event: GatewayEvent,
  ): Promise<void> {
    try {
      if (
        (event.type === 'charge.succeeded' || event.type === 'charge.failed') &&
        event.data.status
      ) {
        await this.outcomes.apply(manager, {
          orderId: event.data.reference,
          chargeId: event.data.chargeId,
          status: event.data.status,
          declineCode: event.data.declineCode ?? null,
          source: 'WEBHOOK',
        });
      } else if (event.type === 'refund.succeeded') {
        await manager.getRepository(RefundEntity).update(
          { orderId: event.data.reference, status: In(['PENDING', 'FAILED']) },
          {
            status: 'SUCCEEDED',
            gatewayRefundId: event.data.refundId ?? null,
          },
        );
      }
    } catch (error) {
      // Retrying cannot fix an unknown reference, so acknowledge it instead of making the gateway retry forever.
      if (error instanceof DomainError && error.code === 'ORDER_NOT_FOUND') {
        this.logger.warn(
          { eventId: event.id, reference: event.data.reference },
          'Webhook for unknown order',
        );
        return;
      }
      throw error;
    }
  }
}
