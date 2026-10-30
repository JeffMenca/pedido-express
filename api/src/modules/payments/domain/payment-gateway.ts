export type GatewayChargeStatus =
  | 'PROCESSING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'DECLINED'
  | 'PARTIALLY_REFUNDED'
  | 'REFUNDED';

export interface GatewayCharge {
  id: string;
  reference: string;
  amount: number;
  status: GatewayChargeStatus;
  declineCode: string | null;
  cardLast4?: string;
}

export interface CardData {
  number: string;
  exp: string;
  cvv: string;
}

export interface CreateChargeInput {
  amountCents: number;
  reference: string;
  callbackUrl: string;
  card: CardData;
}

export type CreateChargeResult =
  | { kind: 'ACCEPTED'; charge: GatewayCharge }
  | { kind: 'DECLINED'; charge: GatewayCharge }
  /** Outcome unknown (timeout, network, 5xx, request still in progress): never treat as failed. */
  | { kind: 'UNKNOWN'; reason: string }
  | { kind: 'REJECTED'; httpStatus: number; error: string };

export interface GatewayRefund {
  id: string;
  status: string;
}

export abstract class PaymentGateway {
  abstract createCharge(
    input: CreateChargeInput,
    idempotencyKey: string,
  ): Promise<CreateChargeResult>;
  abstract findChargesByReference(reference: string): Promise<GatewayCharge[]>;
  abstract refund(
    chargeId: string,
    amountCents: number,
    idempotencyKey: string,
    callbackUrl: string,
  ): Promise<GatewayRefund>;
}
