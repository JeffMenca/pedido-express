import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DomainError } from '../../../common/errors/domain-error';
import { Money } from '../../../common/money/money';
import { AuditService } from '../../audit/application/audit.service';
import { AuthenticatedUser } from '../../auth/domain/authenticated-user';
import { OrderResponse } from '../../orders/application/order.mapper';
import { OrdersService } from '../../orders/application/orders.service';
import { OrderTransitionsService } from '../../orders/application/order-transitions.service';
import { OrderRepository } from '../../orders/infrastructure/order.repository';

@Injectable()
export class CashPaymentService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly orders: OrderRepository,
    private readonly ordersService: OrdersService,
    private readonly transitions: OrderTransitionsService,
    private readonly audit: AuditService,
  ) {}

  async confirm(
    orderId: string,
    receivedCents: number,
    user: AuthenticatedUser,
  ): Promise<{ order: OrderResponse; changeCents: number }> {
    await this.ordersService.findById(orderId);
    const changeCents = await this.dataSource.transaction(async (manager) => {
      const order = await this.orders.lockById(manager, orderId);
      if (order.paymentMethod !== 'EFECTIVO') {
        throw new DomainError(
          'PAYMENT_METHOD_NOT_ALLOWED',
          'This order is paid by card',
        );
      }
      if (receivedCents < order.totalCents) {
        throw new DomainError(
          'INSUFFICIENT_CASH',
          `Received ${Money.format(receivedCents)} does not cover ${Money.format(order.totalCents)}`,
          {
            totalCents: order.totalCents,
            receivedCents,
            missingCents: order.totalCents - receivedCents,
          },
        );
      }
      await this.transitions.apply(
        manager,
        order,
        'CASH_RECEIVED',
        user.role,
        user.username,
      );
      const change = receivedCents - order.totalCents;
      await this.audit.record(manager, {
        action: 'CASH_PAYMENT_CONFIRMED',
        orderId,
        actor: user,
        data: {
          totalCents: order.totalCents,
          receivedCents,
          changeCents: change,
        },
      });
      return change;
    });
    return { order: await this.ordersService.findById(orderId), changeCents };
  }
}
