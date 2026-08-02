import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoginCommand } from '../login.command';
import { InvalidCredentialsException } from '@iam/users/domain/exceptions/invalid-credentials.exception';
import { UserDeactivatedException } from '@iam/users/domain/exceptions/user-deactivated.exception';
import { Result } from '@shared/domain/result';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { SESSION_STORE, ISessionStore } from '../../ports/session-store.port';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '@iam/users/domain/ports/user.repository';
import {
  PASSWORD_HASHER,
  type PasswordHasher,
} from '@iam/users/application/ports/password-hasher.port';
import { ConfigService } from '@nestjs/config';
import {
  getRefreshSessionAbsoluteExpiry,
  REFRESH_SESSION_ABSOLUTE_TTL_SECONDS,
} from '../../../domain/session-policy';
import { EmailNotVerifiedException } from '../../../domain/exceptions/email-not-verified.exception';

@CommandHandler(LoginCommand)
export class LoginCommandHandler implements ICommandHandler<
  LoginCommand,
  Result<{ accessToken: string; refreshToken: string }, DomainException>
> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: PasswordHasher,
    private readonly jwtService: JwtService,
    @Inject(SESSION_STORE)
    private readonly sessionStore: ISessionStore,
    private readonly configService: ConfigService,
  ) {}

  async execute(
    command: LoginCommand,
  ): Promise<
    Result<{ accessToken: string; refreshToken: string }, DomainException>
  > {
    const { email, passwordRaw } = command;

    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      return Result.fail(new InvalidCredentialsException());
    }

    if (!user.isActive) {
      return Result.fail(new UserDeactivatedException(email));
    }

    const isPasswordValid = await this.passwordHasher.compare(
      passwordRaw,
      user.password,
    );
    if (!isPasswordValid) {
      return Result.fail(new InvalidCredentialsException());
    }

    if (
      this.configService.get<boolean>('EMAIL_VERIFICATION_REQUIRED', false) &&
      !user.emailVerifiedAt
    ) {
      return Result.fail(new EmailNotVerifiedException());
    }

    const permissions = await this.userRepository.getPermissions(user.id);
    const jti = this.userRepository.nextIdentity();
    const accessPayload = {
      sub: user.id,
      email: user.email,
      permissions,
      tokenVersion: user.tokenVersion,
      jti,
    };
    const refreshPayload = { sub: user.id, email: user.email, jti };

    const accessToken = this.jwtService.sign(accessPayload, {
      secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: '15m',
    });

    const refreshToken = this.jwtService.sign(refreshPayload, {
      secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: '7d',
    });

    const createdAt = new Date().toISOString();
    const sessionData = {
      jti,
      sessionId: jti,
      ip: command.ip || 'Unknown',
      userAgent: command.userAgent || 'Unknown',
      createdAt,
      absoluteExpiresAt: getRefreshSessionAbsoluteExpiry(createdAt),
    };
    await this.sessionStore.saveRefreshToken(
      user.id,
      jti,
      sessionData,
      REFRESH_SESSION_ABSOLUTE_TTL_SECONDS,
    );

    return Result.ok({ accessToken, refreshToken });
  }
}
