import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { AuditLogModule } from './audit/audit-log.module';

@Module({
    imports: [
        AuthModule,
        UsersModule,
        RolesModule,
        AuditLogModule,
    ],
    exports: [AuthModule, UsersModule, RolesModule, AuditLogModule],
})
export class IamModule { }