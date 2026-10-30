import { createHmac, randomUUID } from 'crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/app.setup';
import {
  CreateChargeInput,
  CreateChargeResult,
  GatewayCharge,
  GatewayRefund,
  PaymentGateway,
} from '../../src/modules/payments/domain/payment-gateway';

process.env.NODE_ENV = 'test';

export const CARD = { number: '4111111111111111', exp: '12/28', cvv: '123' };

export type RefundBehavior = 'ok' | 'unknown' | 'reject';

/** Scriptable stand-in for the payment processor. */
export class FakeGateway extends PaymentGateway {
  chargeCalls: { input: CreateChargeInput; key: string }[] = [];
  refundCalls: { chargeId: string; key: string }[] = [];
  nextCharge: CreateChargeResult = { kind: 'UNKNOWN', reason: 'TIMEOUT' };
  charges: GatewayCharge[] = [];
  refundBehavior: RefundBehavior = 'ok';

  reset(): void {
    this.chargeCalls = [];
    this.refundCalls = [];
    this.nextCharge = { kind: 'UNKNOWN', reason: 'TIMEOUT' };
    this.charges = [];
    this.refundBehavior = 'ok';
  }

  async createCharge(
    input: CreateChargeInput,
    key: string,
  ): Promise<CreateChargeResult> {
    this.chargeCalls.push({ input, key });
    await new Promise((resolve) => setTimeout(resolve, 30));
    return this.nextCharge;
  }

  async findChargesByReference(): Promise<GatewayCharge[]> {
    return this.charges;
  }

  async refund(
    chargeId: string,
    _amountCents: number,
    key: string,
  ): Promise<GatewayRefund> {
    this.refundCalls.push({ chargeId, key });
    if (this.refundBehavior === 'unknown') throw new Error('socket hang up');
    if (this.refundBehavior === 'reject') {
      const { DomainError } =
        await import('../../src/common/errors/domain-error');
      throw new DomainError('GATEWAY_ERROR', 'Refund rejected');
    }
    return { id: `re_${randomUUID().slice(0, 8)}`, status: 'SUCCEEDED' };
  }
}

export async function createTestApp(gateway: FakeGateway) {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(PaymentGateway)
    .useValue(gateway)
    .compile();
  const app: INestApplication = moduleRef.createNestApplication({
    rawBody: true,
  });
  configureApp(app);
  await app.init();
  return app;
}

export const idempotencyKey = (prefix = 'e2e') => `${prefix}-${randomUUID()}`;

export function client(app: INestApplication) {
  const http = () => request(app.getHttpServer());

  const login = async (username: string) =>
    (
      await http()
        .post('/api/auth/login')
        .send({ username, password: 'PedidoExpress2026' })
        .expect(200)
    ).body.accessToken as string;

  const signedWebhook = (event: object) => {
    const raw = JSON.stringify(event);
    const ts = String(Math.floor(Date.now() / 1000));
    const signature = `v1=${createHmac(
      'sha256',
      process.env.GATEWAY_WEBHOOK_SECRET as string,
    )
      .update(`${ts}.${raw}`)
      .digest('hex')}`;
    return http()
      .post('/api/webhooks/payments')
      .set('Content-Type', 'application/json')
      .set('X-Sim-Timestamp', ts)
      .set('X-Sim-Signature', signature)
      .send(raw);
  };

  const createOrder = async (
    paymentMethod: 'TARJETA' | 'EFECTIVO',
    extra: object = {},
  ) =>
    (
      await http()
        .post('/api/orders')
        .send({
          channel: 'MOSTRADOR',
          paymentMethod,
          items: [{ type: 'PRODUCT', sku: 'P-004', quantity: 3 }],
          ...extra,
        })
        .expect(201)
    ).body;

  const payCard = (orderId: string, key = idempotencyKey()) =>
    http()
      .post(`/api/orders/${orderId}/payments/card`)
      .set('Idempotency-Key', key)
      .send({ card: CARD });

  const getOrder = async (orderId: string) =>
    (await http().get(`/api/orders/${orderId}`).expect(200)).body;

  const chargeEvent = (
    orderId: string,
    chargeId: string,
    status: 'SUCCEEDED' | 'FAILED',
    eventId = `evt_${randomUUID()}`,
  ) => ({
    id: eventId,
    type: status === 'SUCCEEDED' ? 'charge.succeeded' : 'charge.failed',
    data: {
      chargeId,
      reference: orderId,
      amount: 8970,
      currency: 'GTQ',
      status,
      declineCode: status === 'FAILED' ? 'RISK_REJECTED' : null,
    },
  });

  return {
    http,
    login,
    signedWebhook,
    createOrder,
    payCard,
    getOrder,
    chargeEvent,
  };
}
