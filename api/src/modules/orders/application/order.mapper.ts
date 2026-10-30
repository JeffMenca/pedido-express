import { OrderAggregate } from '../infrastructure/order.repository';
import { OrderEntity } from '../infrastructure/order.entities';

export const orderCode = (order: Pick<OrderEntity, 'number'>): string =>
  `PE-${String(order.number).padStart(4, '0')}`;

export function toOrderResponse({ order, payment, refund }: OrderAggregate) {
  return {
    id: order.id,
    code: orderCode(order),
    channel: order.channel,
    paymentMethod: order.paymentMethod,
    status: order.status,
    lines: order.lines.map(
      ({
        type,
        sku,
        name,
        quantity,
        unitPriceCents,
        upgradeLarge,
        modifiers,
        lineTotalCents,
      }) => ({
        type,
        sku,
        name,
        quantity,
        unitPriceCents,
        upgradeLarge,
        modifiers,
        lineTotalCents,
      }),
    ),
    subtotalCents: order.subtotalCents,
    discountCents: order.discountCents,
    coupon: order.coupon,
    deliveryFeeCents: order.deliveryFeeCents,
    totalCents: order.totalCents,
    taxBaseCents: order.taxBaseCents,
    taxCents: order.taxCents,
    delivery: order.delivery,
    payment: payment
      ? {
          status: payment.status,
          last4: payment.cardLast4,
          declineCode: payment.declineCode,
        }
      : null,
    refund: refund
      ? { status: refund.status, amountCents: refund.amountCents }
      : null,
    history: order.history.map((h) => ({
      from: h.fromStatus,
      to: h.toStatus,
      at: h.at.toISOString(),
      actor: h.actor,
      reason: h.reason,
    })),
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}

export type OrderResponse = ReturnType<typeof toOrderResponse>;

export function toOrderSummary(order: OrderEntity) {
  return {
    id: order.id,
    code: orderCode(order),
    channel: order.channel,
    paymentMethod: order.paymentMethod,
    status: order.status,
    totalCents: order.totalCents,
    lines: order.lines.map(({ name, quantity, upgradeLarge, modifiers }) => ({
      name,
      quantity,
      upgradeLarge,
      modifiers: modifiers.map((m) => m.name),
    })),
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}
