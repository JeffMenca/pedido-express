import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GatewayConfig,
  gatewayConfig,
} from '../../../common/config/app-config';
import { DomainError } from '../../../common/errors/domain-error';
import {
  CreateChargeInput,
  CreateChargeResult,
  GatewayCharge,
  GatewayRefund,
  PaymentGateway,
} from '../domain/payment-gateway';

@Injectable()
export class HttpPaymentGateway extends PaymentGateway {
  private readonly logger = new Logger(HttpPaymentGateway.name);
  private readonly config: GatewayConfig;

  constructor(config: ConfigService) {
    super();
    this.config = gatewayConfig(config);
  }

  async createCharge(
    input: CreateChargeInput,
    idempotencyKey: string,
  ): Promise<CreateChargeResult> {
    const body = {
      amount: input.amountCents,
      currency: 'GTQ',
      reference: input.reference,
      callbackUrl: input.callbackUrl,
      card: {
        number: input.card.number.replace(/\s/g, ''),
        exp: input.card.exp,
        cvv: input.card.cvv,
      },
    };
    let response: Response;
    try {
      response = await this.request(
        'POST',
        '/v1/charges',
        body,
        idempotencyKey,
      );
    } catch (error) {
      const reason =
        error instanceof Error && error.name === 'TimeoutError'
          ? 'TIMEOUT'
          : 'NETWORK_ERROR';
      this.logger.warn(
        { reference: input.reference, reason },
        'Charge outcome unknown',
      );
      return { kind: 'UNKNOWN', reason };
    }
    const payload = (await response.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    if (response.status === 201 || response.status === 200)
      return { kind: 'ACCEPTED', charge: payload as unknown as GatewayCharge };
    if (response.status === 402)
      return { kind: 'DECLINED', charge: payload as unknown as GatewayCharge };
    if (
      response.status >= 500 ||
      (response.status === 409 && payload.error === 'REQUEST_IN_PROGRESS')
    ) {
      return {
        kind: 'UNKNOWN',
        reason: String(payload.error ?? `HTTP_${response.status}`),
      };
    }
    this.logger.error(
      {
        reference: input.reference,
        status: response.status,
        error: payload.error,
      },
      'Charge rejected by gateway',
    );
    return {
      kind: 'REJECTED',
      httpStatus: response.status,
      error: String(payload.error ?? 'UNKNOWN'),
    };
  }

  async findChargesByReference(reference: string): Promise<GatewayCharge[]> {
    const response = await this.request(
      'GET',
      `/v1/charges?reference=${encodeURIComponent(reference)}`,
    );
    if (!response.ok)
      throw new DomainError('GATEWAY_ERROR', 'Could not query charges', {
        status: response.status,
      });
    return (await response.json()) as GatewayCharge[];
  }

  async refund(
    chargeId: string,
    amountCents: number,
    idempotencyKey: string,
    callbackUrl: string,
  ): Promise<GatewayRefund> {
    const response = await this.request(
      'POST',
      '/v1/refunds',
      { chargeId, amount: amountCents, callbackUrl },
      idempotencyKey,
    );
    const payload = (await response.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    if (response.status >= 500)
      throw new Error(`Refund outcome unknown: HTTP ${response.status}`);
    if (response.status !== 201 && response.status !== 200) {
      throw new DomainError(
        'GATEWAY_ERROR',
        'Refund rejected by the payment processor',
        { status: response.status, error: payload.error },
      );
    }
    return { id: String(payload.id), status: String(payload.status) };
  }

  private request(
    method: 'GET' | 'POST',
    path: string,
    body?: unknown,
    idempotencyKey?: string,
  ): Promise<Response> {
    return fetch(`${this.config.url}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(this.config.timeoutMs),
    });
  }
}
