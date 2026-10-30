import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager, In } from 'typeorm';
import { DomainError } from '../../../common/errors/domain-error';
import {
  PaymentAttemptEntity,
  RefundEntity,
} from '../../payments/infrastructure/payment.entities';
import { OrderStatus } from '../domain/order-state-machine';
import { OrderEntity } from './order.entities';

export interface OrderAggregate {
  order: OrderEntity;
  payment: PaymentAttemptEntity | null;
  refund: RefundEntity | null;
}

@Injectable()
export class OrderRepository {
  constructor(private readonly dataSource: DataSource) {}

  /** Pessimistic row lock: serializes webhook, gateway response, timeout and staff actions on the same order. */
  async lockById(manager: EntityManager, id: string): Promise<OrderEntity> {
    const order = await manager
      .getRepository(OrderEntity)
      .createQueryBuilder('o')
      .setLock('pessimistic_write')
      .where('o.id = :id', { id })
      .getOne();
    if (!order)
      throw new DomainError('ORDER_NOT_FOUND', `Order ${id} does not exist`, {
        id,
      });
    return order;
  }

  async findAggregate(id: string): Promise<OrderAggregate> {
    const order = await this.dataSource.getRepository(OrderEntity).findOne({
      where: { id },
      relations: { lines: true, history: true },
      order: { lines: { position: 'ASC' }, history: { at: 'ASC' } },
    });
    if (!order)
      throw new DomainError('ORDER_NOT_FOUND', `Order ${id} does not exist`, {
        id,
      });
    const [payment, refund] = await Promise.all([
      this.dataSource
        .getRepository(PaymentAttemptEntity)
        .findOne({ where: { orderId: id }, order: { createdAt: 'DESC' } }),
      this.dataSource.getRepository(RefundEntity).findOneBy({ orderId: id }),
    ]);
    return { order, payment, refund };
  }

  findByIdempotencyKey(key: string): Promise<OrderEntity | null> {
    return this.dataSource
      .getRepository(OrderEntity)
      .findOneBy({ idempotencyKey: key });
  }

  findByStatuses(statuses: OrderStatus[]): Promise<OrderEntity[]> {
    return this.dataSource.getRepository(OrderEntity).find({
      where: { status: In(statuses) },
      relations: { lines: true },
      order: { createdAt: 'ASC', lines: { position: 'ASC' } },
      take: 200,
    });
  }
}
