import { Controller, Get, Post, Patch, Delete, Body, Param, HttpStatus, HttpCode, UseGuards, UseInterceptors, BadRequestException } from '@nestjs/common';
import { QueryBus, CommandBus } from '@nestjs/cqrs';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/application/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../auth/application/guards/permissions.guard';
import { RequirePermissions } from '../../../auth/application/decorators/permissions.decorator';
import { GetUser } from '@shared/infrastructure/decorators/get-user.decorator';
import { GetUsersQuery, GetUserByIdQuery } from '../../application/queries';
import { DeactivateUserCommand } from '../../application/commands/deactivate-user.command';
import { CreateUserCommand } from '../../application/commands/create-user.command';
import { DeleteUserCommand } from '../../application/commands/delete-user.command';
import { ToggleUserStatusCommand } from '../../application/commands/toggle-user-status.command';
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

    @Post()
    @UseGuards(PermissionsGuard)
    @RequirePermissions('user:create')
    @UseInterceptors(CacheInvalidationInterceptor)
    @InvalidateCache('users:all')
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Create a new user directly by Admin' })
    async createUser(
        @Body() body: { email: string; password?: string; roles?: string[] },
        @GetUser('id') adminId: string,
    ) {
        if (!body.email || !body.password) {
            throw new BadRequestException('Email and password are required');
        }
        const result = await this.commandBus.execute(
            new CreateUserCommand(body.email, body.password, body.roles || ['USER'], adminId),
        );
        const user = result.unwrap();
        return UserPresenter.toResponse(user);
    }

    @Patch(':id/toggle-status')
    @UseGuards(PermissionsGuard)
    @RequirePermissions('user:update')
    @UseInterceptors(CacheInvalidationInterceptor)
    @InvalidateCache('users:all', 'users:me:{id}')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Toggle user active/inactive status' })
    async toggleUserStatus(@Param('id') id: string, @GetUser('id') adminId: string) {
        const result = await this.commandBus.execute(new ToggleUserStatusCommand(id, adminId));
        result.unwrap();
        return { success: true };
    }

    @Patch(':id/deactivate')
    @UseGuards(PermissionsGuard)
    @RequirePermissions('user:update')
    @UseInterceptors(CacheInvalidationInterceptor)
    @InvalidateCache('users:all', 'users:me:{id}')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Deactivate a user account' })
    async deactivateUser(@Param('id') id: string, @GetUser('id') adminId: string) {
        const result = await this.commandBus.execute(new DeactivateUserCommand(id, adminId));
        result.unwrap();
        return { success: true };
    }

    @Delete(':id')
    @UseGuards(PermissionsGuard)
    @RequirePermissions('user:delete')
    @UseInterceptors(CacheInvalidationInterceptor)
    @InvalidateCache('users:all', 'users:me:{id}')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Soft delete a user account' })
    async deleteUser(@Param('id') id: string, @GetUser('id') adminId: string) {
        const result = await this.commandBus.execute(new DeleteUserCommand(id, adminId));
        result.unwrap();
        return;
    }
}
