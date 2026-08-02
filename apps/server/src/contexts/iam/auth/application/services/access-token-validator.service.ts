import { Inject, Injectable } from '@nestjs/common';
import type { AuthenticatedPrincipal } from '@repo/contracts';
import type { JwtPayload } from '@shared/application/auth/jwt-payload';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '@iam/users/domain/ports/user.repository';
import { SESSION_STORE, type ISessionStore } from '../ports/session-store.port';

@Injectable()
export class AccessTokenValidator {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    @Inject(SESSION_STORE)
    private readonly sessionStore: ISessionStore,
  ) {}

  async validate(payload: JwtPayload): Promise<AuthenticatedPrincipal | null> {
    const user = await this.userRepository.findById(payload.sub);
    if (
      !user ||
      !user.isActive ||
      user.isDeleted ||
      user.tokenVersion !== payload.tokenVersion
    ) {
      return null;
    }

    const sessionIsActive = await this.sessionStore.isRefreshTokenValid(
      payload.sub,
      payload.jti,
    );
    if (!sessionIsActive) {
      return null;
    }

    return {
      ...payload,
      id: payload.sub,
    };
  }
}
