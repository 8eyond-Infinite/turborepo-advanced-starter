import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { QueryBus, CommandBus } from '@nestjs/cqrs';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PERMISSIONS } from '@repo/contracts';

import { JwtAuthGuard, PermissionsGuard } from '@presentation/guards';
import {
  RequirePermissions,
  GetUser,
  AuditLog,
} from '@presentation/decorators';

import { GetRolesQuery, GetPermissionsQuery } from '../../application/queries';
import {
  CreateRoleCommand,
  UpdateRolePermissionsCommand,
  DeleteRoleCommand,
} from '../../application/commands';
import { CreateRoleDto, UpdateRolePermissionsDto } from '../dtos';
import type { AuthenticatedPrincipal } from '@repo/contracts';

@ApiTags('Roles')
@ApiBearerAuth()
@Controller('roles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RolesController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
  ) {}

  @Get()
  @RequirePermissions(PERMISSIONS.ROLE.READ)
  @ApiOperation({ summary: 'Get all roles with their mapped permissions' })
  async getRoles() {
    const result = await this.queryBus.execute(new GetRolesQuery());
    const roles = result.unwrap();
    return roles.map((role) => ({
      id: role.id,
      name: role.name,
      description: role.description,
      permissions: role.permissions,
      createdAt: role.createdAt,
    }));
  }

  @Get('permissions')
  @RequirePermissions(PERMISSIONS.ROLE.READ)
  @ApiOperation({ summary: 'Get all system permissions' })
  async getPermissions() {
    const result = await this.queryBus.execute(new GetPermissionsQuery());
    return result.unwrap();
  }

  @Post()
  @RequirePermissions(PERMISSIONS.ROLE.CREATE)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new role' })
  @AuditLog('ROLE_CREATE', (req) => `Tạo vai trò mới: ${req.body.name}`)
  async createRole(
    @Body() body: CreateRoleDto,
    @GetUser() user: AuthenticatedPrincipal,
  ) {
    const result = await this.commandBus.execute(
      new CreateRoleCommand({
        name: body.name,
        description: body.description,
        createdBy: user?.id,
      }),
    );
    const role = result.unwrap();
    return {
      id: role.id,
      name: role.name,
      description: role.description,
      permissions: role.permissions,
    };
  }

  @Put(':id/permissions')
  @RequirePermissions(PERMISSIONS.ROLE.UPDATE)
  @ApiOperation({ summary: 'Update role permissions' })
  @AuditLog(
    'ROLE_UPDATE_PERMISSIONS',
    (req) =>
      `Cập nhật quyền hạn cho vai trò ID: ${String(req.params.id)}. Quyền mới: ${req.body.permissions?.join(', ')}`,
  )
  async updatePermissions(
    @Param('id') id: string,
    @Body() body: UpdateRolePermissionsDto,
    @GetUser() user: AuthenticatedPrincipal,
  ) {
    const result = await this.commandBus.execute(
      new UpdateRolePermissionsCommand({
        id,
        permissions: body.permissions,
        updatedBy: user?.id,
      }),
    );
    const role = result.unwrap();
    return {
      id: role.id,
      name: role.name,
      description: role.description,
      permissions: role.permissions,
    };
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.ROLE.DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a role' })
  @AuditLog('ROLE_DELETE', (req) => `Xóa vai trò ID: ${String(req.params.id)}`)
  async deleteRole(@Param('id') id: string) {
    const result = await this.commandBus.execute(new DeleteRoleCommand({ id }));
    result.unwrap();
    return;
  }
}
