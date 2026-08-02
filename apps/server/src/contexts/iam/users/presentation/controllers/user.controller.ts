import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Query,
  Param,
  HttpStatus,
  HttpCode,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { QueryBus, CommandBus } from '@nestjs/cqrs';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { PERMISSIONS } from '@repo/contracts';

import { JwtAuthGuard, PermissionsGuard } from '@presentation/guards';
import {
  RequirePermissions,
  GetUser,
  AuditLog,
} from '@presentation/decorators';
import {
  CacheInterceptor,
  CacheKey,
  CacheTTL,
  CacheInvalidationInterceptor,
  InvalidateCache,
} from '@infrastructure/cache';
import { PaginatedResponsePresenter } from '@presentation/common/presenters/pagination.presenter';

import { GetUsersQuery, GetUserByIdQuery } from '../../application/queries';
import {
  CreateUserCommand,
  UpdateUserCommand,
  DeleteUserCommand,
  DeactivateUserCommand,
  ActivateUserCommand,
} from '../../application/commands';
import { UserPresenter } from '../presenters/user.presenter';
import { CreateUserDto, GetUsersQueryDto, UpdateUserDto } from '../dtos';
import type { AuthenticatedPrincipal } from '@repo/contracts';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
  ) {}

  @Get('me')
  @UseInterceptors(CacheInterceptor)
  @CacheKey('users:me:{userId}')
  @CacheTTL(60)
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: 200,
    description: 'Return current user details without password',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMe(@GetUser() currentUser: AuthenticatedPrincipal) {
    const result = await this.queryBus.execute(
      new GetUserByIdQuery(currentUser.id),
    );
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
  @ApiResponse({
    status: 403,
    description: 'Forbidden - requires user:read permission',
  })
  async getUsers(@Query() query: GetUsersQueryDto) {
    const result = await this.queryBus.execute(
      new GetUsersQuery(
        query.page,
        query.limit,
        query.search,
        query.sortBy,
        query.sortOrder,
      ),
    );
    const { users, total } = result.unwrap();
    const responseData = users.map((user: any) =>
      UserPresenter.toResponse(user),
    );
    return PaginatedResponsePresenter.toResponse(
      responseData,
      total,
      query.page || 1,
      query.limit || 10,
    );
  }

  @Post()
  @UseGuards(PermissionsGuard)
  @RequirePermissions(PERMISSIONS.USER.CREATE)
  @UseInterceptors(CacheInvalidationInterceptor)
  @InvalidateCache('users:all')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new user directly by Admin' })
  @AuditLog(
    'USER_CREATE',
    (req) =>
      `Tạo tài khoản mới: ${req.body.email} với quyền: ${req.body.roles?.join(', ') || 'USER'}`,
  )
  async createUser(
    @Body() body: CreateUserDto,
    @GetUser('id') adminId: string,
  ) {
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

  @Patch(':id/activate')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(PERMISSIONS.USER.UPDATE)
  @UseInterceptors(CacheInvalidationInterceptor)
  @InvalidateCache('users:all', 'users:me:{id}')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate a user account' })
  @AuditLog(
    'USER_ACTIVATE',
    (req) => `Kích hoạt tài khoản ID: ${String(req.params.id)}`,
  )
  async activateUser(@Param('id') id: string, @GetUser('id') adminId: string) {
    const result = await this.commandBus.execute(
      new ActivateUserCommand({
        id,
        adminId,
      }),
    );
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
  async deactivateUser(
    @Param('id') id: string,
    @GetUser('id') adminId: string,
  ) {
    const result = await this.commandBus.execute(
      new DeactivateUserCommand({
        id,
        adminId,
      }),
    );
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
  @AuditLog(
    'USER_UPDATE',
    (req) =>
      `Cập nhật tài khoản ID: ${String(req.params.id)}. Email mới: ${req.body.email}, Vai trò mới: ${req.body.roles?.join(', ')}`,
  )
  async updateUser(
    @Param('id') id: string,
    @Body() body: UpdateUserDto,
    @GetUser('id') adminId: string,
  ) {
    const result = await this.commandBus.execute(
      new UpdateUserCommand({
        id,
        email: body.email,
        username: body.username,
        roles: body.roles,
        avatar: body.avatar,
        updatedBy: adminId,
      }),
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
  @AuditLog(
    'USER_DELETE',
    (req) => `Xóa tài khoản ID: ${String(req.params.id)}`,
  )
  async deleteUser(@Param('id') id: string, @GetUser('id') adminId: string) {
    const result = await this.commandBus.execute(
      new DeleteUserCommand({
        id,
        adminId,
      }),
    );
    result.unwrap();
    return;
  }
}
