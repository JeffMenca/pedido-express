import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { DomainError } from '../../../common/errors/domain-error';
import { StaffRole } from '../../orders/domain/order-state-machine';
import { AuthenticatedUser } from '../domain/authenticated-user';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser>(error: unknown, user: TUser | false): TUser {
    if (error || !user)
      throw new DomainError('UNAUTHORIZED', 'Missing or invalid access token');
    return user;
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<StaffRole[] | undefined>(
      'roles',
      [context.getHandler(), context.getClass()],
    );
    if (!roles?.length) return true;
    const user = context
      .switchToHttp()
      .getRequest<{ user: AuthenticatedUser }>().user;
    if (!roles.includes(user.role))
      throw new DomainError(
        'FORBIDDEN_ROLE',
        `Role ${user.role} cannot perform this action`,
        { requiredRoles: roles },
      );
    return true;
  }
}
