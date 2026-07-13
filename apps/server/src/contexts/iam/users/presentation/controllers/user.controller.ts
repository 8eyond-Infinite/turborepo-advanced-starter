import { Controller, Get, UseGuards, UseInterceptors } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { JwtAuthGuard } from '../../../auth/application/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../auth/application/guards/permissions.guard';
import { RequirePermissions } from '../../../auth/application/decorators/permissions.decorator';
import { GetUser } from '@shared/infrastructure/decorators/get-user.decorator';
import { GetUsersQuery } from '../../application/queries/get-users.query';
import { GetUserByIdQuery } from '../../application/queries/get-user-by-id.query';
import { UserPresenter } from '../presenters/user.presenter';
import { CacheInterceptor, CacheKey, CacheTTL } from '@shared/infrastructure/cache/cache.interceptor';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UserController {
    constructor(private readonly queryBus: QueryBus) { }

    @Get('me')
    @UseInterceptors(CacheInterceptor)
    @CacheKey('users:me:{userId}')
    @CacheTTL(60)
    async getMe(@GetUser('id') userId: string) {
        const user = await this.queryBus.execute(new GetUserByIdQuery(userId));
        return user ? UserPresenter.toResponse(user) : null;
    }

    @Get()
    @UseGuards(PermissionsGuard)
    @RequirePermissions('user:read')
    @UseInterceptors(CacheInterceptor)
    @CacheKey('users:all')
    @CacheTTL(120)
    async getUsers() {
        const users = await this.queryBus.execute(new GetUsersQuery());
        return users.map((user: any) => UserPresenter.toResponse(user));
    }
}
