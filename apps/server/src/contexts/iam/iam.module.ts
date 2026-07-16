import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';

import { RolesModule } from './roles/roles.module';
import { AuditLogModule } from './audit/audit-log.module';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
    imports: [
        AuthModule,
        UsersModule,
        RolesModule,
        AuditLogModule,
        DashboardModule,
    ],
    // Export ra ngoài để các Bounded Context khác có thể tái sử dụng các module con nếu cần thiết
    exports: [AuthModule, UsersModule, RolesModule, AuditLogModule, DashboardModule],
})
export class IamModule { }