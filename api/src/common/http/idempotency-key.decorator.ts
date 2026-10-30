import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { DomainError } from '../errors/domain-error';

const KEY_PATTERN = /^[A-Za-z0-9_-]{8,100}$/;

const read = (context: ExecutionContext): string | undefined => {
  const value = context.switchToHttp().getRequest<Request>().headers[
    'idempotency-key'
  ];
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !KEY_PATTERN.test(value)) {
    throw new DomainError(
      'VALIDATION_ERROR',
      'Idempotency-Key must be 8-100 chars of [A-Za-z0-9_-]',
    );
  }
  return value;
};

export const OptionalIdempotencyKey = createParamDecorator(
  (_: unknown, context: ExecutionContext) => read(context),
);

export const RequiredIdempotencyKey = createParamDecorator(
  (_: unknown, context: ExecutionContext) => {
    const key = read(context);
    if (!key)
      throw new DomainError(
        'IDEMPOTENCY_KEY_REQUIRED',
        'The Idempotency-Key header is required',
      );
    return key;
  },
);
