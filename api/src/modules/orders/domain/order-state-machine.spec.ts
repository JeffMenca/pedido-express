import { DomainError } from '../../../common/errors/domain-error';
import {
  Actor,
  OrderEvent,
  OrderStateMachine,
  OrderStatus,
} from './order-state-machine';

const errorCode = (fn: () => unknown): string | undefined => {
  try {
    fn();
  } catch (error) {
    return error instanceof DomainError ? error.code : 'UNEXPECTED';
  }
  return undefined;
};

describe('OrderStateMachine', () => {
  it.each<[OrderStatus, OrderEvent, Actor, OrderStatus]>([
    ['PENDIENTE_PAGO', 'PAYMENT_TIMED_OUT', 'SISTEMA', 'PAGO_EN_VERIFICACION'],
    ['PENDIENTE_PAGO', 'PAYMENT_CONFIRMED', 'SISTEMA', 'PAGADA'],
    ['PAGO_EN_VERIFICACION', 'PAYMENT_CONFIRMED', 'SISTEMA', 'PAGADA'],
    ['PENDIENTE_PAGO', 'CASH_RECEIVED', 'CAJERO', 'PAGADA'],
    ['PENDIENTE_PAGO', 'PAYMENT_DECLINED', 'SISTEMA', 'PAGO_RECHAZADO'],
    ['PAGO_EN_VERIFICACION', 'PAYMENT_DECLINED', 'SISTEMA', 'PAGO_RECHAZADO'],
    ['PAGO_RECHAZADO', 'PAYMENT_RETRIED', 'CLIENTE', 'PENDIENTE_PAGO'],
    ['PAGADA', 'PREPARATION_STARTED', 'COCINA', 'EN_PREPARACION'],
    ['EN_PREPARACION', 'PREPARATION_FINISHED', 'COCINA', 'LISTA'],
    ['LISTA', 'DELIVERED', 'CAJERO', 'ENTREGADA'],
    ['PENDIENTE_PAGO', 'CANCELLED', 'CAJERO', 'CANCELADA'],
    ['PAGO_RECHAZADO', 'CANCELLED', 'SUPERVISOR', 'CANCELADA'],
    ['PAGADA', 'CANCELLED', 'SUPERVISOR', 'CANCELADA'],
    ['PENDIENTE_PAGO', 'EXPIRED', 'SISTEMA', 'EXPIRADA'],
  ])('%s --%s(%s)--> %s', (from, event, actor, to) => {
    expect(OrderStateMachine.transition(from, event, actor)).toBe(to);
  });

  it.each<[OrderStatus, OrderEvent, Actor]>([
    ['EN_PREPARACION', 'CANCELLED', 'SUPERVISOR'],
    ['LISTA', 'CANCELLED', 'CAJERO'],
    ['PAGO_EN_VERIFICACION', 'CANCELLED', 'CAJERO'],
    ['PENDIENTE_PAGO', 'PREPARATION_STARTED', 'COCINA'],
    ['PAGADA', 'DELIVERED', 'CAJERO'],
    ['PAGADA', 'PAYMENT_CONFIRMED', 'SISTEMA'],
    ['PAGADA', 'PAYMENT_TIMED_OUT', 'SISTEMA'],
    ['ENTREGADA', 'PREPARATION_STARTED', 'COCINA'],
    ['CANCELADA', 'PAYMENT_CONFIRMED', 'SISTEMA'],
  ])('rejects %s --%s(%s)--> with 409', (from, event, actor) => {
    expect(
      errorCode(() => OrderStateMachine.transition(from, event, actor)),
    ).toBe('INVALID_STATE_TRANSITION');
  });

  it.each<[OrderStatus, OrderEvent, Actor]>([
    ['PAGADA', 'PREPARATION_STARTED', 'CAJERO'],
    ['LISTA', 'DELIVERED', 'COCINA'],
    ['PAGADA', 'CANCELLED', 'COCINA'],
    ['PENDIENTE_PAGO', 'CASH_RECEIVED', 'COCINA'],
  ])('rejects %s --%s by %s with 403', (from, event, actor) => {
    expect(
      errorCode(() => OrderStateMachine.transition(from, event, actor)),
    ).toBe('FORBIDDEN_ROLE');
  });

  it('reports whether an event is allowed without throwing', () => {
    expect(OrderStateMachine.can('PAGADA', 'PAYMENT_CONFIRMED')).toBe(false);
    expect(
      OrderStateMachine.can('PAGO_EN_VERIFICACION', 'PAYMENT_CONFIRMED'),
    ).toBe(true);
  });
});
