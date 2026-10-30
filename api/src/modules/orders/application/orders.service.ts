import { createHash } from 'crypto';
import { Injectable } from '@nestjs/common';
import { DataSource, QueryFailedError } from 'typeorm';
import { Clock } from '../../../common/clock/clock';
import { DomainError } from '../../../common/errors/domain-error';
import { CatalogRepository } from '../../menu/application/catalog.repository';
import {
  Cart,
  PricingEngine,
  Quote,
} from '../../pricing/domain/pricing-engine';
import { AuthenticatedUser } from '../../auth/domain/authenticated-user';
import {
  OrderStatus,
  STAFF_TARGET_EVENTS,
} from '../domain/order-state-machine';
import { OrderEntity, PaymentMethod } from '../infrastructure/order.entities';
import { OrderRepository } from '../infrastructure/order.repository';
import { OrderResponse, toOrderResponse, toOrderSummary } from './order.mapper';
import { OrderTransitionsService } from './order-transitions.service';

export interface CreateOrderCommand extends Cart {
  paymentMethod: PaymentMethod;
  delivery?: { address: string; phone: string };
}

const UNIQUE_VIOLATION = '23505';
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class OrdersService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly catalogRepository: CatalogRepository,
    private readonly orders: OrderRepository,
    private readonly transitions: OrderTransitionsService,
    private readonly clock: Clock,
  ) {}

  async quote(cart: Cart): Promise<Quote> {
    return new PricingEngine(await this.catalogRepository.load()).quote(
      cart,
      this.clock.now(),
    );
  }

  async create(
    command: CreateOrderCommand,
    idempotencyKey?: string,
  ): Promise<{ order: OrderResponse; replayed: boolean }> {
    const requestHash = createHash('sha256')
      .update(JSON.stringify(command))
      .digest('hex');
    if (idempotencyKey) {
      const existing = await this.replay(idempotencyKey, requestHash);
      if (existing) return { order: existing, replayed: true };
    }

    this.assertChannelRules(command);
    const quote = await this.quote(command);

    try {
      const id = await this.dataSource.transaction(async (manager) => {
        const order = manager.getRepository(OrderEntity).create({
          channel: command.channel,
          paymentMethod: command.paymentMethod,
          status: 'PENDIENTE_PAGO',
          subtotalCents: quote.subtotalCents,
          discountCents: quote.discountCents,
          coupon: quote.coupon,
          deliveryFeeCents: quote.deliveryFeeCents,
          totalCents: quote.totalCents,
          taxBaseCents: quote.taxBaseCents,
          taxCents: quote.taxCents,
          delivery:
            command.channel === 'DOMICILIO' && command.delivery
              ? command.delivery
              : null,
          idempotencyKey: idempotencyKey ?? null,
          requestHash,
          lines: quote.lines.map((line, position) => ({ ...line, position })),
          history: [
            {
              fromStatus: null,
              toStatus: 'PENDIENTE_PAGO',
              actor: 'CLIENTE',
              reason: null,
            },
          ],
        });
        return (await manager.save(order)).id;
      });
      return { order: await this.findById(id), replayed: false };
    } catch (error) {
      if (
        idempotencyKey &&
        error instanceof QueryFailedError &&
        (error.driverError as { code?: string }).code === UNIQUE_VIOLATION
      ) {
        const existing = await this.replay(idempotencyKey, requestHash);
        if (existing) return { order: existing, replayed: true };
      }
      throw error;
    }
  }

  async findById(id: string): Promise<OrderResponse> {
    if (!UUID_PATTERN.test(id))
      throw new DomainError('ORDER_NOT_FOUND', `Order ${id} does not exist`, {
        id,
      });
    return toOrderResponse(await this.orders.findAggregate(id));
  }

  async listForOperations(statuses: OrderStatus[]) {
    return (await this.orders.findByStatuses(statuses)).map(toOrderSummary);
  }

  async advanceStatus(
    id: string,
    target: OrderStatus,
    user: AuthenticatedUser,
  ): Promise<OrderResponse> {
    await this.findById(id);
    const event = STAFF_TARGET_EVENTS[target];
    await this.dataSource.transaction(async (manager) => {
      const order = await this.orders.lockById(manager, id);
      if (!event) {
        throw new DomainError(
          'INVALID_STATE_TRANSITION',
          `Status ${target} cannot be set manually`,
          { from: order.status, to: target },
        );
      }
      await this.transitions.apply(
        manager,
        order,
        event,
        user.role,
        user.username,
      );
    });
    return this.findById(id);
  }

  private async replay(
    idempotencyKey: string,
    requestHash: string,
  ): Promise<OrderResponse | null> {
    const existing = await this.orders.findByIdempotencyKey(idempotencyKey);
    if (!existing) return null;
    if (existing.requestHash !== requestHash) {
      throw new DomainError(
        'IDEMPOTENCY_KEY_REUSED',
        'This Idempotency-Key was already used with a different request',
      );
    }
    return this.findById(existing.id);
  }

  private assertChannelRules(command: CreateOrderCommand): void {
    if (command.channel !== 'DOMICILIO') return;
    if (
      !command.delivery?.address?.trim() ||
      !command.delivery?.phone?.trim()
    ) {
      throw new DomainError(
        'DELIVERY_DATA_REQUIRED',
        'Delivery orders require address and phone',
      );
    }
    if (command.paymentMethod !== 'TARJETA') {
      throw new DomainError(
        'PAYMENT_METHOD_NOT_ALLOWED',
        'Delivery orders can only be paid by card',
        { channel: command.channel },
      );
    }
  }
}
