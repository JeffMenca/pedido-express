import { createHmac } from 'crypto';
import { DomainError } from '../../../common/errors/domain-error';
import { verifyWebhookSignature } from './webhook-signature';

const SECRET = 'whsec_test';
const NOW = 1_800_000_000;
const body = '{"id":"evt_1","type":"charge.succeeded"}';
const sign = (ts: number, raw: string, secret = SECRET) =>
  `v1=${createHmac('sha256', secret).update(`${ts}.${raw}`).digest('hex')}`;

const verify = (
  overrides: Partial<Parameters<typeof verifyWebhookSignature>[0]> = {},
) =>
  verifyWebhookSignature({
    rawBody: Buffer.from(body),
    timestampHeader: String(NOW),
    signatureHeader: sign(NOW, body),
    secret: SECRET,
    toleranceSeconds: 300,
    nowSeconds: NOW,
    ...overrides,
  });

const codeOf = (fn: () => void) => {
  try {
    fn();
    return 'OK';
  } catch (error) {
    return (error as DomainError).code;
  }
};

describe('verifyWebhookSignature', () => {
  it('accepts a valid signature over the raw body', () => {
    expect(codeOf(() => verify())).toBe('OK');
  });

  it('rejects a signature made with another secret', () => {
    expect(
      codeOf(() =>
        verify({ signatureHeader: sign(NOW, body, 'firma-invalida') }),
      ),
    ).toBe('INVALID_WEBHOOK_SIGNATURE');
  });

  it('rejects when the body was altered (e.g. re-serialized JSON)', () => {
    expect(
      codeOf(() =>
        verify({
          rawBody: Buffer.from(JSON.stringify(JSON.parse(body), null, 2)),
        }),
      ),
    ).toBe('INVALID_WEBHOOK_SIGNATURE');
  });

  it('rejects timestamps outside the tolerance window', () => {
    const old = NOW - 301;
    expect(
      codeOf(() =>
        verify({
          timestampHeader: String(old),
          signatureHeader: sign(old, body),
        }),
      ),
    ).toBe('INVALID_WEBHOOK_SIGNATURE');
  });

  it.each([
    [undefined, undefined],
    ['abc', sign(NOW, body)],
    [String(NOW), 'v1=short'],
    [String(NOW), 'sha256=deadbeef'],
  ])(
    'rejects malformed headers (%p, %p)',
    (timestampHeader, signatureHeader) => {
      expect(codeOf(() => verify({ timestampHeader, signatureHeader }))).toBe(
        'INVALID_WEBHOOK_SIGNATURE',
      );
    },
  );
});
