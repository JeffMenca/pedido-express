import { DomainError } from '../../../common/errors/domain-error';

export const ORDER_STATUSES = [
  'PENDIENTE_PAGO',
  'PAGO_EN_VERIFICACION',
  'PAGADA',
  'PAGO_RECHAZADO',
  'EN_PREPARACION',
  'LISTA',
  'ENTREGADA',
  'CANCELADA',
  'EXPIRADA',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type StaffRole = 'CAJERO' | 'COCINA' | 'SUPERVISOR';
export type Actor = StaffRole | 'CLIENTE' | 'SISTEMA';

export type OrderEvent =
  | 'PAYMENT_TIMED_OUT'
  | 'PAYMENT_CONFIRMED'
  | 'CASH_RECEIVED'
  | 'PAYMENT_DECLINED'
  | 'PAYMENT_RETRIED'
  | 'PREPARATION_STARTED'
  | 'PREPARATION_FINISHED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'EXPIRED';

interface TransitionRule {
  from: readonly OrderStatus[];
  to: OrderStatus;
  actors: readonly Actor[];
}

const RULES: Record<OrderEvent, TransitionRule> = {
  PAYMENT_TIMED_OUT: {
    from: ['PENDIENTE_PAGO'],
    to: 'PAGO_EN_VERIFICACION',
    actors: ['SISTEMA'],
  },
  PAYMENT_CONFIRMED: {
    from: ['PENDIENTE_PAGO', 'PAGO_EN_VERIFICACION'],
    to: 'PAGADA',
    actors: ['SISTEMA'],
  },
  CASH_RECEIVED: {
    from: ['PENDIENTE_PAGO'],
    to: 'PAGADA',
    actors: ['CAJERO', 'SUPERVISOR'],
  },
  PAYMENT_DECLINED: {
    from: ['PENDIENTE_PAGO', 'PAGO_EN_VERIFICACION'],
    to: 'PAGO_RECHAZADO',
    actors: ['SISTEMA'],
  },
  PAYMENT_RETRIED: {
    from: ['PAGO_RECHAZADO'],
    to: 'PENDIENTE_PAGO',
    actors: ['CLIENTE'],
  },
  PREPARATION_STARTED: {
    from: ['PAGADA'],
    to: 'EN_PREPARACION',
    actors: ['COCINA'],
  },
  PREPARATION_FINISHED: {
    from: ['EN_PREPARACION'],
    to: 'LISTA',
    actors: ['COCINA'],
  },
  DELIVERED: { from: ['LISTA'], to: 'ENTREGADA', actors: ['CAJERO'] },
  // PAGO_EN_VERIFICACION is excluded on purpose: a charge may still be in flight (see DECISIONES.md).
  CANCELLED: {
    from: ['PENDIENTE_PAGO', 'PAGO_RECHAZADO', 'PAGADA'],
    to: 'CANCELADA',
    actors: ['CAJERO', 'SUPERVISOR'],
  },
  EXPIRED: { from: ['PENDIENTE_PAGO'], to: 'EXPIRADA', actors: ['SISTEMA'] },
};

export const STAFF_TARGET_EVENTS: Partial<Record<OrderStatus, OrderEvent>> = {
  EN_PREPARACION: 'PREPARATION_STARTED',
  LISTA: 'PREPARATION_FINISHED',
  ENTREGADA: 'DELIVERED',
};

export const OrderStateMachine = {
  can(from: OrderStatus, event: OrderEvent): boolean {
    return RULES[event].from.includes(from);
  },

  transition(from: OrderStatus, event: OrderEvent, actor: Actor): OrderStatus {
    const rule = RULES[event];
    if (!rule.from.includes(from)) {
      throw new DomainError(
        'INVALID_STATE_TRANSITION',
        `Cannot apply ${event} to an order in ${from}`,
        {
          from,
          event,
          allowedFrom: rule.from,
        },
      );
    }
    if (!rule.actors.includes(actor)) {
      throw new DomainError(
        'FORBIDDEN_ROLE',
        `${actor} cannot apply ${event}`,
        { event, allowedActors: rule.actors },
      );
    }
    return rule.to;
  },
};
