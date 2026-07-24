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
    exports: [AuthModule, UsersModule, RolesModule],
})
export class IamModule { }