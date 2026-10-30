import { RefundExecutor } from './refund-executor';
import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DomainError } from '../../../common/errors/domain-error';
import { AuditService } from '../../audit/application/audit.service';
import { AuthenticatedUser } from '../../auth/domain/authenticated-user';
import { OrderResponse } from '../../orders/application/order.mapper';
import { OrdersService } from '../../orders/application/orders.service';
import { OrderTransitionsService } from '../../orders/application/order-transitions.service';
import { OrderRepository } from '../../orders/infrastructure/order.repository';
import {
  PaymentAttemptEntity,
  RefundEntity,
} from '../infrastructure/payment.entities';

@Injectable()
export class CancellationService {
  private readonly logger = new Logger(CancellationService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly orders: OrderRepository,
    private readonly ordersService: OrdersService,
    private readonly transitions: OrderTransitionsService,
    private readonly audit: AuditService,
    private readonly refunds: RefundExecutor,
  ) {}

  async cancel(
    orderId: string,
    reason: string,
    user: AuthenticatedUser,
  ): Promise<OrderResponse> {
    await this.ordersService.findById(orderId);
    const cardRefund = await this.dataSource.transaction(async (manager) => {
      const order = await this.orders.lockById(manager, orderId);
      const attempts = manager.getRepository(PaymentAttemptEntity);
      if (await attempts.existsBy({ orderId, status: 'PROCESSING' })) {
        throw new DomainError(
          'PAYMENT_VERIFICATION_PENDING',
          'A card payment is still in flight; wait for it to settle before cancelling',
        );
      }
      const wasPaid = order.status === 'PAGADA';
      await this.transitions.apply(
        manager,
        order,
        'CANCELLED',
        user.role,
        user.username,
        reason,
      );
      await this.audit.record(manager, {
        action: 'ORDER_CANCELLED',
        orderId,
        actor: user,
        reason,
        data: { wasPaid },
      });
      if (!wasPaid) return null;

      if (order.paymentMethod === 'EFECTIVO') {
        await manager.getRepository(RefundEntity).insert({
          orderId,
          method: 'EFECTIVO',
          status: 'RECORDED',
          amountCents: order.totalCents,
        });
        await this.audit.record(manager, {
          action: 'CASH_REFUND_RECORDED',
          orderId,
          actor: user,
          reason,
          data: { amountCents: order.totalCents },
        });
        return null;
      }
      await manager.getRepository(RefundEntity).insert({
        orderId,
        method: 'TARJETA',
        status: 'PENDING',
        amountCents: order.totalCents,
      });
      return true;
    });

    if (cardRefund) await this.refunds.execute(orderId, user, reason);
    return this.ordersService.findById(orderId);
  }
}
