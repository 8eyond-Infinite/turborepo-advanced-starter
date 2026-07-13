import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';

@Module({
    imports: [
        AuthModule,
        UsersModule,
        // RolesModule,
        // PermissionsModule,
    ],
    // Export ra ngoài để các Bounded Context khác có thể tái sử dụng các module con nếu cần thiết
    exports: [AuthModule, UsersModule],
})
export class IamModule { }