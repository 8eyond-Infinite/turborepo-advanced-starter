import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { RegisterHandler } from './application/commands/handlers/register.handler';
import { LoginQueryHandler } from './application/queries/handlers/login.handler';
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
        LoginQueryHandler,
        JwtStrategy,
        JwtRefreshStrategy,
    ],
    exports: [PassportModule, JwtStrategy, JwtRefreshStrategy],
})
export class AuthModule { }