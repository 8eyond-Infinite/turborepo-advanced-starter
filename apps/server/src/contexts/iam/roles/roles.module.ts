import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { RolesController } from './presentation/controllers/roles.controller';
import { PrismaRoleRepository } from './infrastructure/repositories/prisma-role.repository';
import { GetRolesQueryHandler } from './application/queries/handlers/get-roles.handler';
import { GetPermissionsQueryHandler } from './application/queries/handlers/get-permissions.handler';
import { CreateRoleCommandHandler } from './application/commands/handlers/create-role.handler';
import { UpdateRolePermissionsCommandHandler } from './application/commands/handlers/update-role-permissions.handler';
import { DeleteRoleCommandHandler } from './application/commands/handlers/delete-role.handler';
import { UsersModule } from '../users/users.module';

@Module({
    imports: [
        CqrsModule,
        UsersModule, // Needed for UserRepository injection in guards
    ],
    controllers: [RolesController],
    providers: [
        {
            provide: 'RoleRepository',
            useClass: PrismaRoleRepository,
        },
        GetRolesQueryHandler,
        GetPermissionsQueryHandler,
        CreateRoleCommandHandler,
        UpdateRolePermissionsCommandHandler,
        DeleteRoleCommandHandler,
    ],
    exports: ['RoleRepository'],
})
export class RolesModule { }
