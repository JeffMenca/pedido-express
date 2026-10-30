import { createHmac, timingSafeEqual } from 'crypto';
import { DomainError } from '../../../common/errors/domain-error';

export interface WebhookSignatureInput {
  rawBody: Buffer;
  timestampHeader: string | undefined;
  signatureHeader: string | undefined;
  secret: string;
  toleranceSeconds: number;
  nowSeconds: number;
}

const SIGNATURE_PREFIX = 'v1=';

const reject = (reason: string): never => {
  throw new DomainError(
    'INVALID_WEBHOOK_SIGNATURE',
    'Webhook signature verification failed',
    { reason },
  );
};

export function verifyWebhookSignature(input: WebhookSignatureInput): void {
  const {
    rawBody,
    timestampHeader,
    signatureHeader,
    secret,
    toleranceSeconds,
    nowSeconds,
  } = input;
  if (!timestampHeader || !/^\d+$/.test(timestampHeader))
    return reject('MISSING_OR_INVALID_TIMESTAMP');
  if (!signatureHeader?.startsWith(SIGNATURE_PREFIX))
    return reject('MISSING_OR_INVALID_SIGNATURE');
  if (Math.abs(nowSeconds - Number(timestampHeader)) > toleranceSeconds)
    return reject('TIMESTAMP_OUT_OF_TOLERANCE');

  const expected = createHmac('sha256', secret)
    .update(`${timestampHeader}.`)
    .update(rawBody)
    .digest();
  const received = Buffer.from(
    signatureHeader.slice(SIGNATURE_PREFIX.length),
    'hex',
  );
  if (
    received.length !== expected.length ||
    !timingSafeEqual(received, expected)
  )
    return reject('SIGNATURE_MISMATCH');
}
