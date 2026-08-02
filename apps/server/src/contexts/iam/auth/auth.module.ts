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
  VerifyEmailHandler,
  RequestEmailVerificationHandler,
} from './application/commands/handlers';
import { GetActiveSessionsQueryHandler } from './application/queries/handlers';
import { UsersModule } from '../users/users.module';
import { AuthController } from './presentation/controllers/auth.controller';
import { JwtRefreshStrategy, JwtStrategy } from './infrastructure/strategies';
import { SESSION_STORE } from './application/ports/session-store.port';
import { RedisSessionStore } from './infrastructure/stores/redis-session.store';
import { AccessTokenValidator } from './application/services/access-token-validator.service';
import { QueueModule } from '@infrastructure/queue/queue.module';
import { PASSWORD_RESET_TOKEN_STORE } from './application/ports/password-reset-token-store.port';
import { PrismaPasswordResetTokenStore } from './infrastructure/stores/prisma-password-reset-token.store';
import { EMAIL_VERIFICATION_TOKEN_STORE } from './application/ports/email-verification-token-store.port';
import { PrismaEmailVerificationTokenStore } from './infrastructure/stores/prisma-email-verification-token.store';
import { EmailVerificationService } from './application/services/email-verification.service';

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
    VerifyEmailHandler,
    RequestEmailVerificationHandler,
    EmailVerificationService,
    {
      provide: PASSWORD_RESET_TOKEN_STORE,
      useClass: PrismaPasswordResetTokenStore,
    },
    {
      provide: EMAIL_VERIFICATION_TOKEN_STORE,
      useClass: PrismaEmailVerificationTokenStore,
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
