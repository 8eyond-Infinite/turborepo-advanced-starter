import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, HttpStatus, HttpCode, BadRequestException } from '@nestjs/common';
import { QueryBus, CommandBus } from '@nestjs/cqrs';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/application/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../auth/application/guards/permissions.guard';
import { RequirePermissions } from '../../../auth/application/decorators/permissions.decorator';
import { GetUser } from '@shared/infrastructure/decorators/get-user.decorator';
import { GetRolesQuery } from '../../application/queries/get-roles.query';
import { GetPermissionsQuery } from '../../application/queries/get-permissions.query';
import { CreateRoleCommand } from '../../application/commands/create-role.command';
import { UpdateRolePermissionsCommand } from '../../application/commands/update-role-permissions.command';
import { DeleteRoleCommand } from '../../application/commands/delete-role.command';
import { AuditLog } from '@shared/infrastructure/decorators/audit-log.decorator';

@ApiTags('Roles')
@ApiBearerAuth()
@Controller('roles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RolesController {
    constructor(
        private readonly queryBus: QueryBus,
        private readonly commandBus: CommandBus,
    ) { }

    @Get()
    @RequirePermissions('user:read')
    @ApiOperation({ summary: 'Get all roles with their mapped permissions' })
    async getRoles() {
        const result = await this.queryBus.execute(new GetRolesQuery());
        const roles = result.unwrap();
        return roles.map(role => ({
            id: role.id,
            name: role.name,
            description: role.description,
            permissions: role.permissions,
            createdAt: role.createdAt,
        }));
    }

    @Get('permissions')
    @RequirePermissions('user:read')
    @ApiOperation({ summary: 'Get all system permissions' })
    async getPermissions() {
        const result = await this.queryBus.execute(new GetPermissionsQuery());
        return result.unwrap();
    }

    @Post()
    @RequirePermissions('user:update')
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Create a new role' })
    @AuditLog('ROLE_CREATE', (req) => `Tạo vai trò mới: ${req.body.name}`)
    async createRole(
        @Body() body: { name: string; description?: string },
        @GetUser() user: any,
    ) {
        if (!body.name) {
            throw new BadRequestException('Role name is required');
        }
        const result = await this.commandBus.execute(
            new CreateRoleCommand(body.name, body.description, user?.id),
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
    @RequirePermissions('user:update')
    @ApiOperation({ summary: 'Update role permissions' })
    @AuditLog('ROLE_UPDATE_PERMISSIONS', (req) => `Cập nhật quyền hạn cho vai trò ID: ${req.params.id}. Quyền mới: ${req.body.permissions?.join(', ')}`)
    async updatePermissions(
        @Param('id') id: string,
        @Body() body: { permissions: string[] },
        @GetUser() user: any,
    ) {
        if (!body.permissions || !Array.isArray(body.permissions)) {
            throw new BadRequestException('Permissions array is required');
        }
        const result = await this.commandBus.execute(
            new UpdateRolePermissionsCommand(id, body.permissions, user?.id),
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
    @RequirePermissions('user:update')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete a role' })
    @AuditLog('ROLE_DELETE', (req) => `Xóa vai trò ID: ${req.params.id}`)
    async deleteRole(@Param('id') id: string) {
        const result = await this.commandBus.execute(new DeleteRoleCommand(id));
        result.unwrap();
        return;
    }
}
