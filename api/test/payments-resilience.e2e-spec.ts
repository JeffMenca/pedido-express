import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ReconciliationService } from '../src/modules/payments/application/reconciliation.service';
import {
  FakeGateway,
  client,
  createTestApp,
  idempotencyKey,
} from './support/e2e-app';

describe('Payment resilience, cancellations and cash (e2e)', () => {
  let app: INestApplication;
  let db: DataSource;
  const gateway = new FakeGateway();
  let api: ReturnType<typeof client>;

  const ageAttempts = (orderId: string, seconds: number) =>
    db.query(
      `UPDATE payment_attempts SET created_at = now() - make_interval(secs => $2) WHERE order_id = $1`,
      [orderId, seconds],
    );
  const ageRefund = (orderId: string) =>
    db.query(
      `UPDATE refunds SET updated_at = now() - interval '1 minute' WHERE order_id = $1`,
      [orderId],
    );
  const auditActions = async (orderId: string) =>
    (
      await db.query(
        `SELECT action, actor_username, actor_role, reason FROM audit_log WHERE order_id = $1 ORDER BY created_at`,
        [orderId],
      )
    ).map((row: { action: string }) => row.action);

  /** Pays by card and settles it through a signed webhook, as the processor would. */
  const payAndSettle = async (orderId: string, chargeId: string) => {
    gateway.nextCharge = {
      kind: 'ACCEPTED',
      charge: {
        id: chargeId,
        reference: orderId,
        amount: 8970,
        status: 'PROCESSING',
        declineCode: null,
      },
    };
    await api.payCard(orderId).expect(202);
    await api
      .signedWebhook(api.chargeEvent(orderId, chargeId, 'SUCCEEDED'))
      .expect(200);
  };

  beforeAll(async () => {
    app = await createTestApp(gateway);
    db = app.get(DataSource);
    api = client(app);
  });

  beforeEach(() => gateway.reset());
  afterAll(() => app.close());

  describe('cash payment', () => {
    it('rejects insufficient cash, accepts exact cash and enforces roles', async () => {
      const order = await api.createOrder('EFECTIVO');
      const cashier = await api.login('cajero');
      const kitchen = await api.login('cocina');
      const pay = (token: string | null, receivedCents: number) => {
        const req = api.http().post(`/api/orders/${order.id}/payments/cash`);
        return (token ? req.set('Authorization', `Bearer ${token}`) : req).send(
          { receivedCents },
        );
      };

      await pay(null, 9000).expect(401);
      await pay(kitchen, 9000).expect(403);
      const short = await pay(cashier, 5000).expect(422);
      expect(short.body).toMatchObject({
        code: 'INSUFFICIENT_CASH',
        details: { totalCents: 8970, missingCents: 3970 },
      });

      const exact = await pay(cashier, 8970).expect(200);
      expect(exact.body).toMatchObject({
        changeCents: 0,
        order: { status: 'PAGADA' },
      });
      expect(await auditActions(order.id)).toEqual(['CASH_PAYMENT_CONFIRMED']);
    });

    it('does not accept cash for a card order', async () => {
      const order = await api.createOrder('TARJETA');
      const cashier = await api.login('cajero');
      await api
        .http()
        .post(`/api/orders/${order.id}/payments/cash`)
        .set('Authorization', `Bearer ${cashier}`)
        .send({ receivedCents: 9000 })
        .expect(422)
        .expect((res) =>
          expect(res.body.code).toBe('PAYMENT_METHOD_NOT_ALLOWED'),
        );
    });
  });

  describe('cancellation', () => {
    it('records a cash refund and audits who cancelled and why', async () => {
      const order = await api.createOrder('EFECTIVO');
      const cashier = await api.login('cajero');
      const supervisor = await api.login('supervisor');
      await api
        .http()
        .post(`/api/orders/${order.id}/payments/cash`)
        .set('Authorization', `Bearer ${cashier}`)
        .send({ receivedCents: 10000 })
        .expect(200);

      await api
        .http()
        .post(`/api/orders/${order.id}/cancel`)
        .set('Authorization', `Bearer ${supervisor}`)
        .send({})
        .expect(400);
      const cancelled = await api
        .http()
        .post(`/api/orders/${order.id}/cancel`)
        .set('Authorization', `Bearer ${supervisor}`)
        .send({ reason: 'Cliente se retiró' })
        .expect(200);

      expect(cancelled.body).toMatchObject({
        status: 'CANCELADA',
        refund: { status: 'RECORDED', amountCents: 8970 },
      });
      const rows = await db.query(
        `SELECT action, actor_username, actor_role, reason FROM audit_log WHERE order_id = $1 AND action = 'ORDER_CANCELLED'`,
        [order.id],
      );
      expect(rows[0]).toMatchObject({
        actor_username: 'supervisor',
        actor_role: 'SUPERVISOR',
        reason: 'Cliente se retiró',
      });
      expect(await auditActions(order.id)).toEqual([
        'CASH_PAYMENT_CONFIRMED',
        'ORDER_CANCELLED',
        'CASH_REFUND_RECORDED',
      ]);
    });

    it('refunds a paid card order through the gateway with a deterministic key', async () => {
      const order = await api.createOrder('TARJETA');
      await payAndSettle(order.id, 'ch_paid');
      const cashier = await api.login('cajero');

      const cancelled = await api
        .http()
        .post(`/api/orders/${order.id}/cancel`)
        .set('Authorization', `Bearer ${cashier}`)
        .send({ reason: 'Pedido duplicado' })
        .expect(200);

      expect(cancelled.body.refund).toEqual({
        status: 'SUCCEEDED',
        amountCents: 8970,
      });
      expect(gateway.refundCalls).toEqual([
        { chargeId: 'ch_paid', key: `refund-${order.id}` },
      ]);
      expect(await auditActions(order.id)).toEqual([
        'ORDER_CANCELLED',
        'REFUND_SUCCEEDED',
      ]);
    });

    it('cannot cancel once preparation started', async () => {
      const order = await api.createOrder('EFECTIVO');
      const cashier = await api.login('cajero');
      const kitchen = await api.login('cocina');
      await api
        .http()
        .post(`/api/orders/${order.id}/payments/cash`)
        .set('Authorization', `Bearer ${cashier}`)
        .send({ receivedCents: 9000 })
        .expect(200);
      await api
        .http()
        .patch(`/api/orders/${order.id}/status`)
        .set('Authorization', `Bearer ${kitchen}`)
        .send({ status: 'EN_PREPARACION' })
        .expect(200);

      await api
        .http()
        .post(`/api/orders/${order.id}/cancel`)
        .set('Authorization', `Bearer ${cashier}`)
        .send({ reason: 'Tarde' })
        .expect(409)
        .expect((res) =>
          expect(res.body.code).toBe('INVALID_STATE_TRANSITION'),
        );
    });

    it('keeps a refund pending when the gateway outcome is unknown and completes it later without refunding twice', async () => {
      const order = await api.createOrder('TARJETA');
      await payAndSettle(order.id, 'ch_refund_retry');
      const cashier = await api.login('cajero');
      gateway.refundBehavior = 'unknown';

      const cancelled = await api
        .http()
        .post(`/api/orders/${order.id}/cancel`)
        .set('Authorization', `Bearer ${cashier}`)
        .send({ reason: 'Error de caja' })
        .expect(200);
      expect(cancelled.body.refund.status).toBe('PENDING');

      gateway.refundBehavior = 'ok';
      await ageRefund(order.id);
      await app.get(ReconciliationService).run();

      expect((await api.getOrder(order.id)).refund.status).toBe('SUCCEEDED');
      const keys = gateway.refundCalls.map((call) => call.key);
      expect(new Set(keys)).toEqual(new Set([`refund-${order.id}`]));
    });

    it('marks a refund as failed only when the gateway rejects it', async () => {
      const order = await api.createOrder('TARJETA');
      await payAndSettle(order.id, 'ch_refund_reject');
      const cashier = await api.login('cajero');
      gateway.refundBehavior = 'reject';

      const cancelled = await api
        .http()
        .post(`/api/orders/${order.id}/cancel`)
        .set('Authorization', `Bearer ${cashier}`)
        .send({ reason: 'Error de caja' })
        .expect(200);

      expect(cancelled.body.refund.status).toBe('FAILED');
      expect(await auditActions(order.id)).toContain('REFUND_FAILED');
    });
  });

  describe('card payment resilience', () => {
    it('ignores a late result of an old charge once the customer retried with another card', async () => {
      const order = await api.createOrder('TARJETA');
      gateway.nextCharge = {
        kind: 'ACCEPTED',
        charge: {
          id: 'ch_old',
          reference: order.id,
          amount: 8970,
          status: 'PROCESSING',
          declineCode: null,
        },
      };
      await api.payCard(order.id).expect(202);
      await api
        .signedWebhook(api.chargeEvent(order.id, 'ch_old', 'FAILED'))
        .expect(200);
      expect((await api.getOrder(order.id)).status).toBe('PAGO_RECHAZADO');

      gateway.nextCharge = { kind: 'UNKNOWN', reason: 'TIMEOUT' };
      await api.payCard(order.id).expect(202);
      expect((await api.getOrder(order.id)).status).toBe(
        'PAGO_EN_VERIFICACION',
      );

      // A redelivery of the old failure (new event id) must not reject the live attempt.
      await api
        .signedWebhook(api.chargeEvent(order.id, 'ch_old', 'FAILED'))
        .expect(200);
      expect((await api.getOrder(order.id)).status).toBe(
        'PAGO_EN_VERIFICACION',
      );

      await api
        .signedWebhook(api.chargeEvent(order.id, 'ch_new', 'SUCCEEDED'))
        .expect(200);
      expect((await api.getOrder(order.id)).status).toBe('PAGADA');
    });

    it('reconciles a timed-out charge by asking the gateway', async () => {
      const order = await api.createOrder('TARJETA');
      await api.payCard(order.id).expect(202);
      expect((await api.getOrder(order.id)).status).toBe(
        'PAGO_EN_VERIFICACION',
      );

      gateway.charges = [
        {
          id: 'ch_found',
          reference: order.id,
          amount: 8970,
          status: 'SUCCEEDED',
          declineCode: null,
        },
      ];
      await ageAttempts(order.id, 120);
      await app.get(ReconciliationService).run();

      const settled = await api.getOrder(order.id);
      expect(settled.status).toBe('PAGADA');
      expect(settled.history.at(-1)).toMatchObject({
        to: 'PAGADA',
        actor: 'RECONCILIATION',
      });
    });

    it('fails an attempt only after the gateway has no trace of the charge for a while', async () => {
      const order = await api.createOrder('TARJETA');
      await api.payCard(order.id).expect(202);

      await ageAttempts(order.id, 20);
      await app.get(ReconciliationService).run();
      expect((await api.getOrder(order.id)).status).toBe(
        'PAGO_EN_VERIFICACION',
      );

      await ageAttempts(order.id, 120);
      await app.get(ReconciliationService).run();
      expect((await api.getOrder(order.id)).status).toBe('PAGO_RECHAZADO');
    });

    it('never sends the card number or CVV to the logs or the order response', async () => {
      const order = await api.createOrder('TARJETA');
      const response = await api.payCard(order.id).expect(202);
      const body = JSON.stringify([
        response.body,
        await api.getOrder(order.id),
      ]);
      expect(body).not.toContain('4111111111111111');
      expect(body).not.toContain('"cvv"');
      expect(body).toContain('1111');
    });
  });

  describe('order creation rules', () => {
    it('rejects reusing an Idempotency-Key with a different cart', async () => {
      const key = idempotencyKey('create');
      const body = {
        channel: 'MOSTRADOR',
        paymentMethod: 'EFECTIVO',
        items: [{ type: 'PRODUCT', sku: 'P-001', quantity: 1 }],
      };
      await api
        .http()
        .post('/api/orders')
        .set('Idempotency-Key', key)
        .send(body)
        .expect(201);
      await api
        .http()
        .post('/api/orders')
        .set('Idempotency-Key', key)
        .send({
          ...body,
          items: [{ type: 'PRODUCT', sku: 'P-001', quantity: 2 }],
        })
        .expect(409)
        .expect((res) => expect(res.body.code).toBe('IDEMPOTENCY_KEY_REUSED'));
    });

    it('requires card payment plus address and phone for delivery', async () => {
      const items = [{ type: 'PRODUCT', sku: 'P-001', quantity: 1 }];
      await api
        .http()
        .post('/api/orders')
        .send({
          channel: 'DOMICILIO',
          paymentMethod: 'EFECTIVO',
          items,
          delivery: { address: 'Zona 10', phone: '55551234' },
        })
        .expect(422)
        .expect((res) =>
          expect(res.body.code).toBe('PAYMENT_METHOD_NOT_ALLOWED'),
        );
      await api
        .http()
        .post('/api/orders')
        .send({ channel: 'DOMICILIO', paymentMethod: 'TARJETA', items })
        .expect(422)
        .expect((res) => expect(res.body.code).toBe('DELIVERY_DATA_REQUIRED'));
    });

    it('answers unknown orders with a typed 404', async () => {
      await api
        .http()
        .get('/api/orders/00000000-0000-4000-8000-000000000000')
        .expect(404)
        .expect((res) =>
          expect(res.body).toMatchObject({ code: 'ORDER_NOT_FOUND' }),
        );
    });
  });
});
