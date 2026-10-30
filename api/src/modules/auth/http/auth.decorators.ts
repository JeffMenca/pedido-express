import {
  applyDecorators,
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Request } from 'express';
import { ErrorResponseDto } from '../../../common/errors/error-response.dto';
import { StaffRole } from '../../orders/domain/order-state-machine';
import { AuthenticatedUser } from '../domain/authenticated-user';
import { JwtAuthGuard, RolesGuard } from './auth.guards';

export const ROLES_KEY = 'roles';

export const Staff = (...roles: StaffRole[]) =>
  applyDecorators(
    SetMetadata(ROLES_KEY, roles),
    UseGuards(JwtAuthGuard, RolesGuard),
    ApiBearerAuth(),
    ApiUnauthorizedResponse({
      type: ErrorResponseDto,
      description: 'UNAUTHORIZED',
    }),
    ApiForbiddenResponse({
      type: ErrorResponseDto,
      description: 'FORBIDDEN_ROLE',
    }),
  );

export const CurrentUser = createParamDecorator(
  (_: unknown, context: ExecutionContext): AuthenticatedUser =>
    context.switchToHttp().getRequest<Request & { user: AuthenticatedUser }>()
      .user,
);
