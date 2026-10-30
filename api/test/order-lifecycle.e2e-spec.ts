import { createHmac, randomUUID } from 'crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import {
  CreateChargeInput,
  CreateChargeResult,
  GatewayCharge,
  PaymentGateway,
} from '../src/modules/payments/domain/payment-gateway';

process.env.NODE_ENV = 'test';

class FakeGateway extends PaymentGateway {
  calls: CreateChargeInput[] = [];
  next: CreateChargeResult = { kind: 'UNKNOWN', reason: 'TIMEOUT' };

  async createCharge(input: CreateChargeInput): Promise<CreateChargeResult> {
    this.calls.push(input);
    await new Promise((resolve) => setTimeout(resolve, 50));
    return this.next;
  }
  async findChargesByReference(): Promise<GatewayCharge[]> {
    return [];
  }
  async refund() {
    return { id: 're_fake', status: 'SUCCEEDED' };
  }
}

const CARD = { number: '4111111111111111', exp: '12/28', cvv: '123' };
const cart = (paymentMethod: 'TARJETA' | 'EFECTIVO') => ({
  channel: 'MOSTRADOR',
  paymentMethod,
  items: [{ type: 'PRODUCT', sku: 'P-004', quantity: 3 }],
});

describe('Order lifecycle (e2e)', () => {
  let app: INestApplication;
  const gateway = new FakeGateway();
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

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PaymentGateway)
      .useValue(gateway)
      .compile();
    app = moduleRef.createNestApplication({ rawBody: true });
    configureApp(app);
    await app.init();
  });

  afterAll(() => app.close());

  it('takes a cash order from creation to delivery, with exact amounts', async () => {
    const { paymentMethod: _, ...quoteRequest } = cart('EFECTIVO');
    const quote = await http()
      .post('/api/orders/quote')
      .send(quoteRequest)
      .expect(200);
    expect(quote.body).toMatchObject({ subtotalCents: 8970, totalCents: 8970 });
    expect(quote.body.taxBaseCents + quote.body.taxCents).toBe(8970);

    const order = (
      await http().post('/api/orders').send(cart('EFECTIVO')).expect(201)
    ).body;
    expect(order.status).toBe('PENDIENTE_PAGO');

    const cashier = await login('cajero');
    const kitchen = await login('cocina');
    await http()
      .patch(`/api/orders/${order.id}/status`)
      .set('Authorization', `Bearer ${kitchen}`)
      .send({ status: 'EN_PREPARACION' })
      .expect(409);

    const paid = await http()
      .post(`/api/orders/${order.id}/payments/cash`)
      .set('Authorization', `Bearer ${cashier}`)
      .send({ receivedCents: 10000 })
      .expect(200);
    expect(paid.body).toMatchObject({
      changeCents: 1030,
      order: { status: 'PAGADA' },
    });

    await http()
      .patch(`/api/orders/${order.id}/status`)
      .set('Authorization', `Bearer ${cashier}`)
      .send({ status: 'EN_PREPARACION' })
      .expect(403);
    await http()
      .patch(`/api/orders/${order.id}/status`)
      .set('Authorization', `Bearer ${kitchen}`)
      .send({ status: 'EN_PREPARACION' })
      .expect(200);
    await http()
      .patch(`/api/orders/${order.id}/status`)
      .set('Authorization', `Bearer ${kitchen}`)
      .send({ status: 'LISTA' })
      .expect(200);
    const delivered = await http()
      .patch(`/api/orders/${order.id}/status`)
      .set('Authorization', `Bearer ${cashier}`)
      .send({ status: 'ENTREGADA' })
      .expect(200);

    expect(delivered.body.history.map((h: { to: string }) => h.to)).toEqual([
      'PENDIENTE_PAGO',
      'PAGADA',
      'EN_PREPARACION',
      'LISTA',
      'ENTREGADA',
    ]);
  });

  it('charges once for concurrent requests, verifies on timeout and applies a duplicated webhook once', async () => {
    const order = (
      await http().post('/api/orders').send(cart('TARJETA')).expect(201)
    ).body;
    gateway.calls = [];
    gateway.next = { kind: 'UNKNOWN', reason: 'TIMEOUT' };
    const key = `e2e-${randomUUID()}`;

    const [first, second] = await Promise.all([
      http()
        .post(`/api/orders/${order.id}/payments/card`)
        .set('Idempotency-Key', key)
        .send({ card: CARD }),
      http()
        .post(`/api/orders/${order.id}/payments/card`)
        .set('Idempotency-Key', key)
        .send({ card: CARD }),
    ]);
    expect(gateway.calls).toHaveLength(1);
    expect([first.status, second.status]).toEqual([202, 202]);
    expect((await http().get(`/api/orders/${order.id}`)).body.status).toBe(
      'PAGO_EN_VERIFICACION',
    );

    await http()
      .post(`/api/orders/${order.id}/payments/card`)
      .set('Idempotency-Key', `e2e-${randomUUID()}`)
      .send({ card: CARD })
      .expect(409);

    const event = {
      id: `evt_${randomUUID()}`,
      type: 'charge.succeeded',
      data: {
        chargeId: 'ch_e2e',
        reference: order.id,
        amount: 8970,
        currency: 'GTQ',
        status: 'SUCCEEDED',
        declineCode: null,
      },
    };
    const results = await Promise.all([
      signedWebhook(event),
      signedWebhook(event),
    ]);
    expect(results.map((r) => r.status)).toEqual([200, 200]);
    expect(results.map((r) => r.body.result).sort()).toEqual([
      'DUPLICATE',
      'PROCESSED',
    ]);

    const settled = (await http().get(`/api/orders/${order.id}`)).body;
    expect(settled.status).toBe('PAGADA');
    expect(
      settled.history.filter((h: { to: string }) => h.to === 'PAGADA'),
    ).toHaveLength(1);
  });

  it('rejects a webhook with an invalid signature', async () => {
    await http()
      .post('/api/webhooks/payments')
      .set('X-Sim-Timestamp', String(Math.floor(Date.now() / 1000)))
      .set('X-Sim-Signature', `v1=${'0'.repeat(64)}`)
      .send({
        id: 'evt_forged',
        type: 'charge.succeeded',
        data: { reference: randomUUID() },
      })
      .expect(401)
      .expect((res) => expect(res.body.code).toBe('INVALID_WEBHOOK_SIGNATURE'));
  });
});
