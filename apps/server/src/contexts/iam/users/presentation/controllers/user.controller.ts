import { Controller, Get, Post, Put, Patch, Delete, Body, Query, Param, HttpStatus, HttpCode, UseGuards, UseInterceptors, BadRequestException } from '@nestjs/common';
import { QueryBus, CommandBus } from '@nestjs/cqrs';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PERMISSIONS } from '@repo/contracts';

import { JwtAuthGuard, PermissionsGuard } from '@shared/infrastructure/guards';
import { RequirePermissions, GetUser, AuditLog } from '@shared/infrastructure/decorators';
import { CacheInterceptor, CacheKey, CacheTTL, CacheInvalidationInterceptor, InvalidateCache } from '@shared/infrastructure/cache';
import { PaginationQueryDto } from '@shared/infrastructure/dto/pagination-query.dto';
import { PaginatedResponsePresenter } from '@shared/infrastructure/presenters/pagination.presenter';

import { GetUsersQuery, GetUserByIdQuery } from '../../application/queries';
import {
    CreateUserCommand,
    UpdateUserCommand,
    DeleteUserCommand,
    DeactivateUserCommand,
    ToggleUserStatusCommand,
} from '../../application/commands';
import { UserPresenter } from '../presenters/user.presenter';

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
    async getMe(@GetUser() currentUser: any) {
        const result = await this.queryBus.execute(new GetUserByIdQuery(currentUser.id));
        const userEntity = result.unwrap();
        if (!userEntity) return null;
        const responseData = UserPresenter.toResponse(userEntity);
        return {
            ...responseData,
            permissions: currentUser.permissions || [],
        };
    }

    @Get()
    @UseGuards(PermissionsGuard)
    @RequirePermissions(PERMISSIONS.USER.READ)
    @ApiOperation({ summary: 'Get all users list with pagination' })
    @ApiResponse({ status: 200, description: 'Return paginated users list' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden - requires user:read permission' })
    async getUsers(@Query() query: PaginationQueryDto) {
        const result = await this.queryBus.execute(
            new GetUsersQuery(query.page, query.limit, query.search, query.sortBy, query.sortOrder)
        );
        const { users, total } = result.unwrap();
        const responseData = users.map((user: any) => UserPresenter.toResponse(user));
        return PaginatedResponsePresenter.toResponse(
            responseData,
            total,
            query.page || 1,
            query.limit || 10
        );
    }

    @Post()
    @UseGuards(PermissionsGuard)
    @RequirePermissions(PERMISSIONS.USER.CREATE)
    @UseInterceptors(CacheInvalidationInterceptor)
    @InvalidateCache('users:all')
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Create a new user directly by Admin' })
    @AuditLog('USER_CREATE', (req) => `Tạo tài khoản mới: ${req.body.email} với quyền: ${req.body.roles?.join(', ') || 'USER'}`)
    async createUser(
        @Body() body: { email: string; username: string; password?: string; avatar?: string | null; roles?: string[] },
        @GetUser('id') adminId: string,
    ) {
        if (!body.email || !body.password) {
            throw new BadRequestException('Email and password are required');
        }
        const result = await this.commandBus.execute(
            new CreateUserCommand({
                email: body.email,
                username: body.username,
                passwordHash: body.password,
                roles: body.roles || ['USER'],
                avatar: body.avatar,
                createdBy: adminId,
            }),
        );
        const user = result.unwrap();
        return UserPresenter.toResponse(user);
    }

    @Patch(':id/toggle-status')
    @UseGuards(PermissionsGuard)
    @RequirePermissions(PERMISSIONS.USER.UPDATE)
    @UseInterceptors(CacheInvalidationInterceptor)
    @InvalidateCache('users:all', 'users:me:{id}')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Toggle user active/inactive status' })
    @AuditLog('USER_TOGGLE_STATUS', (req) => `Thay đổi trạng thái kích hoạt của tài khoản ID: ${req.params.id}`)
    async toggleUserStatus(@Param('id') id: string, @GetUser('id') adminId: string) {
        const result = await this.commandBus.execute(new ToggleUserStatusCommand({
            id,
            adminId,
        }));
        result.unwrap();
        return { success: true };
    }

    @Patch(':id/deactivate')
    @UseGuards(PermissionsGuard)
    @RequirePermissions(PERMISSIONS.USER.UPDATE)
    @UseInterceptors(CacheInvalidationInterceptor)
    @InvalidateCache('users:all', 'users:me:{id}')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Deactivate a user account' })
    async deactivateUser(@Param('id') id: string, @GetUser('id') adminId: string) {
        const result = await this.commandBus.execute(new DeactivateUserCommand({
            id,
            adminId,
        }));
        result.unwrap();
        return { success: true };
    }

    @Put(':id')
    @UseGuards(PermissionsGuard)
    @RequirePermissions(PERMISSIONS.USER.UPDATE)
    @UseInterceptors(CacheInvalidationInterceptor)
    @InvalidateCache('users:all', 'users:me:{id}')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Update user email and roles' })
    @AuditLog('USER_UPDATE', (req) => `Cập nhật tài khoản ID: ${req.params.id}. Email mới: ${req.body.email}, Vai trò mới: ${req.body.roles?.join(', ')}`)
    async updateUser(
        @Param('id') id: string,
        @Body() body: { email: string; username: string; avatar?: string | null; roles: string[] },
        @GetUser('id') adminId: string,
    ) {
        if (!body.email) {
            throw new BadRequestException('Email is required');
        }
        const result = await this.commandBus.execute(
            new UpdateUserCommand({
                id,
                email: body.email,
                username: body.username,
                roles: body.roles,
                avatar: body.avatar,
                updatedBy: adminId,
            })
        );
        result.unwrap();
        return { success: true };
    }

    @Delete(':id')
    @UseGuards(PermissionsGuard)
    @RequirePermissions(PERMISSIONS.USER.DELETE)
    @UseInterceptors(CacheInvalidationInterceptor)
    @InvalidateCache('users:all', 'users:me:{id}')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Soft delete a user account' })
    @AuditLog('USER_DELETE', (req) => `Xóa tài khoản ID: ${req.params.id}`)
    async deleteUser(@Param('id') id: string, @GetUser('id') adminId: string) {
        const result = await this.commandBus.execute(new DeleteUserCommand({
            id,
            adminId,
        }));
        result.unwrap();
        return;
    }
}
