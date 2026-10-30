import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MenuModule } from '../menu/menu.module';
import { OrderTransitionsService } from './application/order-transitions.service';
import { OrdersService } from './application/orders.service';
import {
  OperationsController,
  OrdersController,
} from './http/orders.controller';
import { ORDER_ENTITIES } from './infrastructure/order.entities';
import { OrderRepository } from './infrastructure/order.repository';

@Module({
  imports: [TypeOrmModule.forFeature(ORDER_ENTITIES), MenuModule],
  controllers: [OrdersController, OperationsController],
  providers: [OrdersService, OrderRepository, OrderTransitionsService],
  exports: [OrdersService, OrderRepository, OrderTransitionsService],
})
export class OrdersModule {}
