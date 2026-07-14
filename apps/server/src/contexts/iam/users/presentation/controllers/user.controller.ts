import { Controller, Get, Patch, Param, HttpStatus, HttpCode, UseGuards, UseInterceptors } from '@nestjs/common';
import { QueryBus, CommandBus } from '@nestjs/cqrs';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/application/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../auth/application/guards/permissions.guard';
import { RequirePermissions } from '../../../auth/application/decorators/permissions.decorator';
import { GetUser } from '@shared/infrastructure/decorators/get-user.decorator';
import { GetUsersQuery, GetUserByIdQuery } from '../../application/queries';
import { DeactivateUserCommand } from '../../application/commands/deactivate-user.command';
import { UserPresenter } from '../presenters/user.presenter';
import { CacheInterceptor, CacheKey, CacheTTL } from '@shared/infrastructure/cache/cache.interceptor';
import { CacheInvalidationInterceptor, InvalidateCache } from '@shared/infrastructure/cache/cache-invalidation.interceptor';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UserController {
    constructor(
        private readonly queryBus: QueryBus,
        private readonly commandBus: CommandBus,
    ) { }

    @Get('me')
    @UseInterceptors(CacheInterceptor)
    @CacheKey('users:me:{userId}')
    @CacheTTL(60)
    @ApiOperation({ summary: 'Get current user profile' })
    @ApiResponse({ status: 200, description: 'Return current user details without password' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async getMe(@GetUser('id') userId: string) {
        const result = await this.queryBus.execute(new GetUserByIdQuery(userId));
        const user = result.unwrap();
        return user ? UserPresenter.toResponse(user) : null;
    }

    @Get()
    @UseGuards(PermissionsGuard)
    @RequirePermissions('user:read')
    @UseInterceptors(CacheInterceptor)
    @CacheKey('users:all')
    @CacheTTL(120)
    @ApiOperation({ summary: 'Get all users list' })
    @ApiResponse({ status: 200, description: 'Return array of all active users' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden - requires user:read permission' })
    async getUsers() {
        const result = await this.queryBus.execute(new GetUsersQuery());
        const users = result.unwrap();
        return users.map((user: any) => UserPresenter.toResponse(user));
    }

    @Patch(':id/deactivate')
    @UseGuards(PermissionsGuard)
    @RequirePermissions('user:update')
    @UseInterceptors(CacheInvalidationInterceptor)
    @InvalidateCache('users:all', 'users:me:{id}')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Deactivate a user account (Admin only)' })
    @ApiResponse({ status: 200, description: 'User account deactivated successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden - requires user:update permission' })
    async deactivateUser(@Param('id') id: string, @GetUser('id') adminId: string) {
        const result = await this.commandBus.execute(new DeactivateUserCommand(id, adminId));
        result.unwrap();
        return { success: true };
    }
}
