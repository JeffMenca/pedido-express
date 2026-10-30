import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import {
  ApiAcceptedResponse,
  ApiBadGatewayResponse,
  ApiConflictResponse,
  ApiExcludeEndpoint,
  ApiHeader,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { RawBodyRequest } from '@nestjs/common';
import { Request } from 'express';
import { ErrorResponseDto } from '../../../common/errors/error-response.dto';
import { RequiredIdempotencyKey } from '../../../common/http/idempotency-key.decorator';
import { CurrentUser, Staff } from '../../auth/http/auth.decorators';
import { AuthenticatedUser } from '../../auth/domain/authenticated-user';
import { CancelOrderDto } from '../../orders/http/order.dtos';
import { CancellationService } from '../application/cancellation.service';
import { CardPaymentService } from '../application/card-payment.service';
import { CashPaymentService } from '../application/cash-payment.service';
import { WebhookService } from '../application/webhook.service';
import { CardPaymentDto, CashPaymentDto } from './payment.dtos';

@ApiTags('payments')
@Controller('orders')
export class PaymentsController {
  constructor(
    private readonly card: CardPaymentService,
    private readonly cash: CashPaymentService,
    private readonly cancellation: CancellationService,
  ) {}

  @Post(':id/payments/card')
  @HttpCode(202)
  @ApiHeader({
    name: 'Idempotency-Key',
    required: true,
    description: 'One key per payment attempt; reuse it on retries',
  })
  @ApiAcceptedResponse({
    description:
      'Current order status: PAGADA, PENDIENTE_PAGO (awaiting webhook), PAGO_EN_VERIFICACION or PAGO_RECHAZADO',
  })
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description:
      'PAYMENT_ALREADY_IN_PROGRESS, PAYMENT_VERIFICATION_PENDING, IDEMPOTENCY_KEY_REUSED, INVALID_STATE_TRANSITION',
  })
  @ApiBadGatewayResponse({
    type: ErrorResponseDto,
    description: 'GATEWAY_ERROR',
  })
  payWithCard(
    @Param('id') id: string,
    @Body() dto: CardPaymentDto,
    @RequiredIdempotencyKey() key: string,
  ) {
    return this.card.pay(id, key, dto.card);
  }

  @Post(':id/payments/cash')
  @HttpCode(200)
  @Staff('CAJERO', 'SUPERVISOR')
  @ApiUnprocessableEntityResponse({
    type: ErrorResponseDto,
    description: 'INSUFFICIENT_CASH, PAYMENT_METHOD_NOT_ALLOWED',
  })
  payWithCash(
    @Param('id') id: string,
    @Body() dto: CashPaymentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.cash.confirm(id, dto.receivedCents, user);
  }

  @Post(':id/cancel')
  @HttpCode(200)
  @Staff('CAJERO', 'SUPERVISOR')
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description: 'INVALID_STATE_TRANSITION, PAYMENT_VERIFICATION_PENDING',
  })
  cancel(
    @Param('id') id: string,
    @Body() dto: CancelOrderDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.cancellation.cancel(id, dto.reason, user);
  }
}

@ApiTags('webhooks')
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooks: WebhookService) {}

  @Post('payments')
  @HttpCode(200)
  @ApiExcludeEndpoint(false)
  async receive(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-sim-timestamp') timestamp?: string,
    @Headers('x-sim-signature') signature?: string,
  ) {
    const result = await this.webhooks.handle(req.rawBody, {
      timestamp,
      signature,
    });
    return { received: true, result };
  }
}
