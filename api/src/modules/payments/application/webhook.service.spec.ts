import { createHmac } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { EntityManager } from 'typeorm';
import { DomainError } from '../../../common/errors/domain-error';
import {
  ChargeOutcome,
  PaymentOutcomeService,
} from './payment-outcome.service';
import { InboxEvent, InboxResult, WebhookInbox } from './webhook-inbox';
import { WebhookService } from './webhook.service';

const SECRET = 'whsec_test';

class InMemoryInbox extends WebhookInbox {
  private readonly seen = new Set<string>();
  async processOnce(
    event: InboxEvent,
    handler: (manager: EntityManager) => Promise<void>,
  ): Promise<InboxResult> {
    if (this.seen.has(event.id)) return 'DUPLICATE';
    this.seen.add(event.id);
    await handler({} as EntityManager);
    return 'PROCESSED';
  }
}

function signed(event: object) {
  const raw = Buffer.from(JSON.stringify(event));
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = `v1=${createHmac('sha256', SECRET).update(`${timestamp}.`).update(raw).digest('hex')}`;
  return { raw, headers: { timestamp, signature } };
}

describe('WebhookService', () => {
  const applied: ChargeOutcome[] = [];
  const outcomes = {
    apply: jest.fn(
      async (_m: EntityManager, o: ChargeOutcome) => void applied.push(o),
    ),
  } as unknown as PaymentOutcomeService;
  const config = new ConfigService({
    GATEWAY_URL: 'http://gw',
    GATEWAY_API_KEY: 'k',
    GATEWAY_WEBHOOK_SECRET: SECRET,
    GATEWAY_TIMEOUT_MS: 5000,
    WEBHOOK_CALLBACK_URL: 'http://api/webhooks',
    WEBHOOK_TOLERANCE_SECONDS: 300,
  });
  const service = new WebhookService(new InMemoryInbox(), outcomes, config);
  const event = {
    id: 'evt_dup',
    type: 'charge.succeeded',
    data: {
      chargeId: 'ch_1',
      reference: 'order-1',
      amount: 1000,
      currency: 'GTQ',
      status: 'SUCCEEDED',
      declineCode: null,
    },
  };

  beforeEach(() => {
    applied.length = 0;
  });

  it('applies a duplicated event only once', async () => {
    const first = signed(event);
    const second = signed(event);
    expect(await service.handle(first.raw, first.headers)).toBe('PROCESSED');
    expect(await service.handle(second.raw, second.headers)).toBe('DUPLICATE');
    expect(applied).toHaveLength(1);
    expect(applied[0]).toMatchObject({
      orderId: 'order-1',
      chargeId: 'ch_1',
      status: 'SUCCEEDED',
      source: 'WEBHOOK',
    });
  });

  it('rejects an invalid signature before touching state', async () => {
    const { raw, headers } = signed({ ...event, id: 'evt_bad' });
    await expect(
      service.handle(raw, { ...headers, signature: `v1=${'0'.repeat(64)}` }),
    ).rejects.toMatchObject({
      code: 'INVALID_WEBHOOK_SIGNATURE',
    });
    expect(applied).toHaveLength(0);
  });

  it('still processes the valid delivery after an invalid one with the same id', async () => {
    const bad = signed({ ...event, id: 'evt_077' });
    await expect(
      service.handle(bad.raw, { ...bad.headers, signature: 'v1=abcd' }),
    ).rejects.toBeInstanceOf(DomainError);
    const good = signed({ ...event, id: 'evt_077' });
    expect(await service.handle(good.raw, good.headers)).toBe('PROCESSED');
    expect(applied).toHaveLength(1);
  });
});
