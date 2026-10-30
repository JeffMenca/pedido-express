import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import {
  Actor,
  OrderEvent,
  OrderStateMachine,
} from '../domain/order-state-machine';
import {
  OrderEntity,
  OrderStatusHistoryEntity,
} from '../infrastructure/order.entities';

@Injectable()
export class OrderTransitionsService {
  /** Caller must hold the order row lock inside `manager`'s transaction. */
  async apply(
    manager: EntityManager,
    order: OrderEntity,
    event: OrderEvent,
    actor: Actor,
    actorLabel: string,
    reason: string | null = null,
  ): Promise<OrderEntity> {
    const from = order.status;
    const to = OrderStateMachine.transition(from, event, actor);
    order.status = to;
    await manager.getRepository(OrderEntity).update(order.id, { status: to });
    await manager.getRepository(OrderStatusHistoryEntity).insert({
      order: { id: order.id },
      fromStatus: from,
      toStatus: to,
      actor: actorLabel,
      reason,
    });
    return order;
  }
}
