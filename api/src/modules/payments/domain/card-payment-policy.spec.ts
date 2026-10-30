import { DomainError } from '../../../common/errors/domain-error';
import {
  decideCardPaymentStart,
  eventForChargeStatus,
} from './card-payment-policy';

const base = {
  orderStatus: 'PENDIENTE_PAGO' as const,
  paymentMethod: 'TARJETA' as const,
  attempts: [],
  clientKey: 'key-1',
  requestHash: 'h1',
};
const codeOf = (fn: () => unknown) => {
  try {
    fn();
    return 'OK';
  } catch (error) {
    return (error as DomainError).code;
  }
};

describe('decideCardPaymentStart', () => {
  it('starts a charge for a pending card order', () => {
    expect(decideCardPaymentStart(base)).toEqual({
      kind: 'START',
      isRetry: false,
    });
  });

  it('replays the same attempt when the client repeats the key (double tap / app retry)', () => {
    const attempt = {
      id: 'a1',
      clientKey: 'key-1',
      requestHash: 'h1',
      status: 'PROCESSING' as const,
    };
    expect(decideCardPaymentStart({ ...base, attempts: [attempt] })).toEqual({
      kind: 'REPLAY',
      attemptId: 'a1',
    });
  });

  it('rejects reusing a key with a different card', () => {
    const attempt = {
      id: 'a1',
      clientKey: 'key-1',
      requestHash: 'other',
      status: 'DECLINED' as const,
    };
    expect(
      codeOf(() =>
        decideCardPaymentStart({
          ...base,
          orderStatus: 'PAGO_RECHAZADO',
          attempts: [attempt],
        }),
      ),
    ).toBe('IDEMPOTENCY_KEY_REUSED');
  });

  it('refuses a second charge while one is in flight, even with a new key', () => {
    const attempt = {
      id: 'a1',
      clientKey: 'key-1',
      requestHash: 'h1',
      status: 'PROCESSING' as const,
    };
    expect(
      codeOf(() =>
        decideCardPaymentStart({
          ...base,
          clientKey: 'key-2',
          attempts: [attempt],
        }),
      ),
    ).toBe('PAYMENT_ALREADY_IN_PROGRESS');
  });

  it('refuses to charge an order that is already paid', () => {
    const attempt = {
      id: 'a1',
      clientKey: 'key-1',
      requestHash: 'h1',
      status: 'SUCCEEDED' as const,
    };
    expect(
      codeOf(() =>
        decideCardPaymentStart({
          ...base,
          orderStatus: 'PAGADA',
          clientKey: 'key-2',
          attempts: [attempt],
        }),
      ),
    ).toBe('INVALID_STATE_TRANSITION');
  });

  it('allows retrying with another card after a decline', () => {
    const attempt = {
      id: 'a1',
      clientKey: 'key-1',
      requestHash: 'h1',
      status: 'DECLINED' as const,
    };
    expect(
      decideCardPaymentStart({
        ...base,
        orderStatus: 'PAGO_RECHAZADO',
        clientKey: 'key-2',
        attempts: [attempt],
      }),
    ).toEqual({
      kind: 'START',
      isRetry: true,
    });
  });

  it('waits for reconciliation instead of charging again while verifying', () => {
    expect(
      codeOf(() =>
        decideCardPaymentStart({
          ...base,
          orderStatus: 'PAGO_EN_VERIFICACION',
          clientKey: 'key-2',
        }),
      ),
    ).toBe('PAYMENT_VERIFICATION_PENDING');
  });

  it('rejects card payment for cash orders', () => {
    expect(
      codeOf(() =>
        decideCardPaymentStart({ ...base, paymentMethod: 'EFECTIVO' }),
      ),
    ).toBe('PAYMENT_METHOD_NOT_ALLOWED');
  });
});

describe('eventForChargeStatus', () => {
  it.each([
    ['SUCCEEDED', 'PAYMENT_CONFIRMED'],
    ['REFUNDED', 'PAYMENT_CONFIRMED'],
    ['FAILED', 'PAYMENT_DECLINED'],
    ['DECLINED', 'PAYMENT_DECLINED'],
    ['PROCESSING', null],
  ] as const)('%s -> %s', (status, event) => {
    expect(eventForChargeStatus(status)).toBe(event);
  });
});
