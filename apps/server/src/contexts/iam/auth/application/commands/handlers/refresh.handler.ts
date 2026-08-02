import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RefreshCommand } from '../refresh.command';
import { SESSION_STORE, ISessionStore } from '../../ports/session-store.port';
import { Result } from '@shared/domain/result';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '@iam/users/domain/ports/user.repository';
import { ConfigService } from '@nestjs/config';
import { UserNotFoundException } from '@iam/users/domain/exceptions/user-not-found.exception';
import { RefreshSessionConsumedException } from '../../../domain/exceptions/refresh-session-consumed.exception';
import {
  getRefreshSessionAbsoluteExpiry,
  getRemainingSessionTtlSeconds,
} from '../../../domain/session-policy';

@CommandHandler(RefreshCommand)
export class RefreshCommandHandler implements ICommandHandler<
  RefreshCommand,
  Result<{ accessToken: string; refreshToken: string }, DomainException>
> {
  constructor(
    private readonly jwtService: JwtService,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    @Inject(SESSION_STORE)
    private readonly sessionStore: ISessionStore,
    private readonly configService: ConfigService,
  ) {}

  async execute(
    command: RefreshCommand,
  ): Promise<
    Result<{ accessToken: string; refreshToken: string }, DomainException>
  > {
    const { userId, jti: oldJti } = command;

    const user = await this.userRepository.findById(userId);
    if (!user) {
      return Result.fail(new UserNotFoundException(userId));
    }
    const permissions = await this.userRepository.getPermissions(userId);
    const newJti = this.userRepository.nextIdentity();
    const oldData = await this.sessionStore.getRefreshTokenSession(
      userId,
      oldJti,
    );
    if (!oldData) {
      const replay = await this.sessionStore.getRefreshReplay(userId, oldJti);
      if (replay) return Result.ok(replay);
      return Result.fail(new RefreshSessionConsumedException());
    }

    const absoluteExpiresAt =
      oldData.absoluteExpiresAt ??
      getRefreshSessionAbsoluteExpiry(oldData.createdAt);
    const remainingTtlSeconds =
      getRemainingSessionTtlSeconds(absoluteExpiresAt);
    if (remainingTtlSeconds <= 0) {
      await this.sessionStore.revokeRefreshToken(userId, oldJti);
      return Result.fail(new RefreshSessionConsumedException());
    }

    const accessPayload = {
      sub: userId,
      email: user.email,
      permissions,
      tokenVersion: user.tokenVersion,
      jti: newJti,
    };
    const refreshPayload = { sub: userId, email: user.email, jti: newJti };

    const accessToken = this.jwtService.sign(accessPayload, {
      secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: '15m',
    });

    const refreshToken = this.jwtService.sign(refreshPayload, {
      secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: remainingTtlSeconds,
    });

    const sessionData = {
      ...oldData,
      jti: newJti,
      sessionId: oldData.sessionId ?? oldData.jti,
      absoluteExpiresAt,
    };

    const rotated = await this.sessionStore.rotateRefreshToken(
      userId,
      oldJti,
      newJti,
      sessionData,
      { accessToken, refreshToken },
      remainingTtlSeconds,
    );
    if (!rotated.tokens) {
      return Result.fail(new RefreshSessionConsumedException());
    }

    return Result.ok(rotated.tokens);
  }
}
