import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiHeader,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiQuery,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { Response } from 'express';
import { ErrorResponseDto } from '../../../common/errors/error-response.dto';
import { OptionalIdempotencyKey } from '../../../common/http/idempotency-key.decorator';
import { CurrentUser, Staff } from '../../auth/http/auth.decorators';
import { AuthenticatedUser } from '../../auth/domain/authenticated-user';
import { OrdersService } from '../application/orders.service';
import { ORDER_STATUSES, OrderStatus } from '../domain/order-state-machine';
import { CartDto, CreateOrderDto, UpdateStatusDto } from './order.dtos';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post('quote')
  @HttpCode(200)
  @ApiOkResponse({
    description:
      'Lines, subtotal, discount, delivery fee, tax base, tax and total (cents)',
  })
  @ApiUnprocessableEntityResponse({
    type: ErrorResponseDto,
    description:
      'PRODUCT_UNAVAILABLE, COUPON_EXPIRED, QUANTITY_OUT_OF_RANGE, ...',
  })
  quote(@Body() cart: CartDto) {
    return this.orders.quote(cart);
  }

  @Post()
  @ApiHeader({ name: 'Idempotency-Key', required: false })
  @ApiOkResponse({
    description:
      'Replayed order for a repeated Idempotency-Key (200) or new order (201)',
  })
  @ApiUnprocessableEntityResponse({
    type: ErrorResponseDto,
    description:
      'DELIVERY_DATA_REQUIRED, PAYMENT_METHOD_NOT_ALLOWED, pricing errors',
  })
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description: 'IDEMPOTENCY_KEY_REUSED',
  })
  async create(
    @Body() dto: CreateOrderDto,
    @OptionalIdempotencyKey() key: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { order, replayed } = await this.orders.create(dto, key);
    res.status(replayed ? 200 : 201);
    return order;
  }

  @Get(':id')
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'ORDER_NOT_FOUND',
  })
  findOne(@Param('id') id: string) {
    return this.orders.findById(id);
  }

  @Patch(':id/status')
  @Staff('COCINA', 'CAJERO', 'SUPERVISOR')
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description: 'INVALID_STATE_TRANSITION',
  })
  advance(
    @Param('id') id: string,
    @Body() dto: UpdateStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.orders.advanceStatus(id, dto.status, user);
  }
}

@ApiTags('operations')
@Controller('operations')
export class OperationsController {
  constructor(private readonly orders: OrdersService) {}

  @Get('orders')
  @Staff('COCINA', 'CAJERO', 'SUPERVISOR')
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Comma separated statuses',
    example: 'PAGADA,EN_PREPARACION,LISTA',
  })
  list(@Query('status') status?: string) {
    const requested = (status ?? 'PENDIENTE_PAGO,PAGADA,EN_PREPARACION,LISTA')
      .split(',')
      .map((s) => s.trim())
      .filter((s): s is OrderStatus =>
        (ORDER_STATUSES as readonly string[]).includes(s),
      );
    return this.orders.listForOperations(requested);
  }
}
