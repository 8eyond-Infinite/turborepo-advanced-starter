import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { LogoutAllCommandHandler, RevokeSessionCommandHandler, LogoutCommandHandler, RegisterHandler } from './application/commands/handlers';
import { LoginQueryHandler, RefreshQueryHandler, GetActiveSessionsQueryHandler } from './application/queries/handlers';
import { UsersModule } from '../users/users.module';
import { AuthController } from './presentation/controllers/auth.controller';
import { JwtStrategy } from './application/strategies/jwt.strategy';
import { JwtRefreshStrategy } from './application/strategies/jwt-refresh.strategy';

@Module({
    imports: [
        CqrsModule,
        UsersModule,
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({}),
    ],
    controllers: [AuthController],
    providers: [
        RegisterHandler,
        LogoutCommandHandler,
        LogoutAllCommandHandler,
        RevokeSessionCommandHandler,
        LoginQueryHandler,
        RefreshQueryHandler,
        GetActiveSessionsQueryHandler,
        JwtStrategy,
        JwtRefreshStrategy,
    ],
    exports: [PassportModule, JwtStrategy, JwtRefreshStrategy],
})
export class AuthModule { }