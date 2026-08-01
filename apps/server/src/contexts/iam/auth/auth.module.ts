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
  RequestPasswordResetHandler,
  ResetPasswordHandler,
} from './application/commands/handlers';
import { GetActiveSessionsQueryHandler } from './application/queries/handlers';
import { UsersModule } from '../users/users.module';
import { AuthController } from './presentation/controllers/auth.controller';
import { JwtRefreshStrategy, JwtStrategy } from './infrastructure/strategies';
import { SESSION_STORE } from './domain/ports/session-store.port';
import { RedisSessionStore } from './infrastructure/stores/redis-session.store';
import { AccessTokenValidator } from './application/services/access-token-validator.service';
import { QueueModule } from '@infrastructure/queue/queue.module';
import { PASSWORD_RESET_TOKEN_STORE } from './domain/ports/password-reset-token-store.port';
import { PrismaPasswordResetTokenStore } from './infrastructure/stores/prisma-password-reset-token.store';

@Module({
  imports: [
    CqrsModule,
    UsersModule,
    QueueModule,
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
    RequestPasswordResetHandler,
    ResetPasswordHandler,
    {
      provide: PASSWORD_RESET_TOKEN_STORE,
      useClass: PrismaPasswordResetTokenStore,
    },
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
