import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersModule } from '../orders/orders.module';
import { CancellationService } from './application/cancellation.service';
import { CardPaymentService } from './application/card-payment.service';
import { CashPaymentService } from './application/cash-payment.service';
import { PaymentOutcomeService } from './application/payment-outcome.service';
import { ReconciliationService } from './application/reconciliation.service';
import { RefundExecutor } from './application/refund-executor';
import { WebhookInbox } from './application/webhook-inbox';
import { WebhookService } from './application/webhook.service';
import { PaymentGateway } from './domain/payment-gateway';
import {
  PaymentsController,
  WebhooksController,
} from './http/payments.controller';
import { HttpPaymentGateway } from './infrastructure/http-payment-gateway';
import { PAYMENT_ENTITIES } from './infrastructure/payment.entities';
import { TypeOrmWebhookInbox } from './infrastructure/typeorm-webhook-inbox';

@Module({
  imports: [TypeOrmModule.forFeature(PAYMENT_ENTITIES), OrdersModule],
  controllers: [PaymentsController, WebhooksController],
  providers: [
    { provide: PaymentGateway, useClass: HttpPaymentGateway },
    { provide: WebhookInbox, useClass: TypeOrmWebhookInbox },
    PaymentOutcomeService,
    CardPaymentService,
    CashPaymentService,
    CancellationService,
    WebhookService,
    ReconciliationService,
    RefundExecutor,
  ],
})
export class PaymentsModule {}
