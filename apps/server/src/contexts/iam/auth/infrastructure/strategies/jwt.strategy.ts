import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import type { AuthenticatedPrincipal, JwtPayload } from '@repo/contracts';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '@iam/users/domain/ports/user.repository';
import {
  SESSION_STORE,
  type ISessionStore,
} from '../../domain/ports/session-store.port';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    @Inject(SESSION_STORE)
    private readonly sessionStore: ISessionStore,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedPrincipal> {
    const user = await this.userRepository.findById(payload.sub);
    if (
      !user ||
      !user.isActive ||
      user.isDeleted ||
      user.tokenVersion !== payload.tokenVersion
    ) {
      throw new UnauthorizedException('Access token has been revoked');
    }

    const sessionIsActive = await this.sessionStore.isRefreshTokenValid(
      payload.sub,
      payload.jti,
    );
    if (!sessionIsActive) {
      throw new UnauthorizedException('Session has been revoked');
    }

    return {
      ...payload,
      id: payload.sub,
    };
  }
}
