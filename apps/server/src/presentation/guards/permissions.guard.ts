import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { hasAllPermissions, PermissionType } from '@repo/contracts';
import type { AuthenticatedRequest } from '../http/authenticated-request';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<
      PermissionType[]
    >('permissions', [context.getHandler(), context.getClass()]);

    if (!requiredPermissions?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException();
    }

    const userPermissions = user.permissions || [];
    const allowed = hasAllPermissions(userPermissions, requiredPermissions);

    if (!allowed) {
      throw new ForbiddenException('Permission denied');
    }

    return true;
  }
}
