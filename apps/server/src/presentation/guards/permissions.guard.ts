import { CanActivate, ExecutionContext, Injectable, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { hasAllPermissions, JwtPayload, PermissionType } from '@repo/contracts';

@Injectable()
export class PermissionsGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
    ) { }

    canActivate(context: ExecutionContext): boolean {
        const requiredPermissions = this.reflector.getAllAndOverride<PermissionType[]>('permissions', [
            context.getHandler(),
            context.getClass(),
        ]);

        if (!requiredPermissions?.length) {
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const user = request.user as JwtPayload | undefined;

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
