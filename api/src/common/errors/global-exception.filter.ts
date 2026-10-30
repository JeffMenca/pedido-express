import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { DomainError } from './domain-error';
import { ErrorCode } from './error-code';

interface ErrorBody {
  code: string;
  message: string;
  details?: unknown;
}

const HTTP_STATUS_TO_CODE: Partial<Record<number, ErrorCode>> = {
  [HttpStatus.BAD_REQUEST]: 'VALIDATION_ERROR',
  [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
  [HttpStatus.FORBIDDEN]: 'FORBIDDEN_ROLE',
  [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
};

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const { status, body } = this.toErrorResponse(exception);
    if (status >= 500) this.logger.error(exception);
    response.status(status).json(body);
  }

  private toErrorResponse(exception: unknown): {
    status: number;
    body: ErrorBody;
  } {
    if (exception instanceof DomainError) {
      return {
        status: ErrorCode[exception.code],
        body: {
          code: exception.code,
          message: exception.message,
          details: exception.details,
        },
      };
    }
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();
      const raw =
        typeof payload === 'object' && payload !== null
          ? (payload as Record<string, unknown>)
          : {};
      const details = Array.isArray(raw.message) ? raw.message : undefined;
      const message =
        typeof raw.message === 'string' ? raw.message : exception.message;
      return {
        status,
        body: {
          code: HTTP_STATUS_TO_CODE[status] ?? 'INTERNAL_ERROR',
          message,
          details,
        },
      };
    }
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: { code: 'INTERNAL_ERROR', message: 'Unexpected error' },
    };
  }
}
