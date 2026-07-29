import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import {
  LogoutAllCommandHandler,
  RevokeSessionCommandHandler,
  LogoutCommandHandler,
  RegisterHandler,
  LoginCommandHandler,
  RefreshCommandHandler,
  RevokeOtherSessionsCommandHandler,
} from './application/commands/handlers';
import { GetActiveSessionsQueryHandler } from './application/queries/handlers';
import { UsersModule } from '../users/users.module';
import { AuthController } from './presentation/controllers/auth.controller';
import { JwtRefreshStrategy, JwtStrategy } from './infrastructure/strategies';
import { SESSION_STORE } from './domain/ports/session-store.port';
import { RedisSessionStore } from './infrastructure/stores/redis-session.store';
import { AccessTokenValidator } from './application/services/access-token-validator.service';

@Module({
  imports: [
    CqrsModule,
    UsersModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({}),
  ],
  controllers: [AuthController],
  providers: [
    {
      provide: SESSION_STORE,
      useClass: RedisSessionStore,
    },
    RegisterHandler,
    LoginCommandHandler,
    RefreshCommandHandler,
    LogoutCommandHandler,
    LogoutAllCommandHandler,
    RevokeSessionCommandHandler,
    RevokeOtherSessionsCommandHandler,
    GetActiveSessionsQueryHandler,
    JwtStrategy,
    JwtRefreshStrategy,
    AccessTokenValidator,
  ],
  exports: [
    PassportModule,
    JwtStrategy,
    JwtRefreshStrategy,
    SESSION_STORE,
    AccessTokenValidator,
  ],
})
export class AuthModule {}
