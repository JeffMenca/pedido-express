import { DomainError } from '../../../common/errors/domain-error';
import {
  OrderEvent,
  OrderStatus,
} from '../../orders/domain/order-state-machine';
import { PaymentMethod } from '../../orders/infrastructure/order.entities';
import { GatewayChargeStatus } from './payment-gateway';

export type PaymentAttemptStatus =
  'PROCESSING' | 'SUCCEEDED' | 'DECLINED' | 'FAILED' | 'ERROR';

export interface AttemptSnapshot {
  id: string;
  clientKey: string;
  requestHash: string;
  status: PaymentAttemptStatus;
}

export interface CardPaymentStartInput {
  orderStatus: OrderStatus;
  paymentMethod: PaymentMethod;
  attempts: AttemptSnapshot[];
  clientKey: string;
  requestHash: string;
}

export type CardPaymentStartDecision =
  { kind: 'REPLAY'; attemptId: string } | { kind: 'START'; isRetry: boolean };

export function decideCardPaymentStart(
  input: CardPaymentStartInput,
): CardPaymentStartDecision {
  const sameKey = input.attempts.find((a) => a.clientKey === input.clientKey);
  if (sameKey) {
    if (sameKey.requestHash !== input.requestHash) {
      throw new DomainError(
        'IDEMPOTENCY_KEY_REUSED',
        'This Idempotency-Key was already used with different payment data',
      );
    }
    return { kind: 'REPLAY', attemptId: sameKey.id };
  }
  if (input.paymentMethod !== 'TARJETA') {
    throw new DomainError(
      'PAYMENT_METHOD_NOT_ALLOWED',
      'This order is paid in cash at the counter',
    );
  }
  if (input.attempts.some((a) => a.status === 'PROCESSING')) {
    throw new DomainError(
      'PAYMENT_ALREADY_IN_PROGRESS',
      'A card payment for this order is already being processed',
    );
  }
  switch (input.orderStatus) {
    case 'PENDIENTE_PAGO':
      return { kind: 'START', isRetry: false };
    case 'PAGO_RECHAZADO':
      return { kind: 'START', isRetry: true };
    case 'PAGO_EN_VERIFICACION':
      throw new DomainError(
        'PAYMENT_VERIFICATION_PENDING',
        'The previous payment is being verified with the processor',
      );
    default:
      throw new DomainError(
        'INVALID_STATE_TRANSITION',
        `Cannot pay an order in ${input.orderStatus}`,
        { from: input.orderStatus },
      );
  }
}

export function eventForChargeStatus(
  status: GatewayChargeStatus,
): Extract<OrderEvent, 'PAYMENT_CONFIRMED' | 'PAYMENT_DECLINED'> | null {
  switch (status) {
    case 'SUCCEEDED':
    case 'PARTIALLY_REFUNDED':
    case 'REFUNDED':
      return 'PAYMENT_CONFIRMED';
    case 'FAILED':
    case 'DECLINED':
      return 'PAYMENT_DECLINED';
    default:
      return null;
  }
}

export const attemptStatusForCharge = (
  status: GatewayChargeStatus,
): PaymentAttemptStatus =>
  eventForChargeStatus(status) === 'PAYMENT_CONFIRMED'
    ? 'SUCCEEDED'
    : status === 'FAILED'
      ? 'FAILED'
      : status === 'DECLINED'
        ? 'DECLINED'
        : 'PROCESSING';
