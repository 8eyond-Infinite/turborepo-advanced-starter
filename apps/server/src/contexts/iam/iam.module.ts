import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';

import { RolesModule } from './roles/roles.module';

@Module({
    imports: [
        AuthModule,
        UsersModule,
        RolesModule,
    ],
    // Export ra ngoài để các Bounded Context khác có thể tái sử dụng các module con nếu cần thiết
    exports: [AuthModule, UsersModule, RolesModule],
})
export class IamModule { }