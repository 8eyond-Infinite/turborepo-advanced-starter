import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import {
  SESSION_STORE,
  ISessionStore,
} from '../../application/ports/session-store.port';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '@iam/users/domain/ports/user.repository';
import { refreshTokenFromCookie } from '../../presentation/refresh-cookie';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    @Inject(SESSION_STORE)
    private readonly sessionStore: ISessionStore,
    private readonly configService: ConfigService,
  ) {
    super({
      // Cookie trước, bearer sau: trình duyệt (admin) dùng HttpOnly cookie;
      // API client/mobile/E2E vẫn gửi được qua Authorization header.
      jwtFromRequest: ExtractJwt.fromExtractors([
        refreshTokenFromCookie,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      passReqToCallback: true,
    });
  }

  async validate(
    req: Request,
    payload: { sub: string; email: string; jti: string },
  ) {
    const user = await this.userRepository.findById(payload.sub);
    if (!user || !user.isActive || user.isDeleted) {
      throw new UnauthorizedException('User is inactive or no longer exists');
    }

    const session = await this.sessionStore.getRefreshTokenSession(
      payload.sub,
      payload.jti,
    );
    const replay = session
      ? null
      : await this.sessionStore.getRefreshReplay(payload.sub, payload.jti);
    if (!session && !replay) {
      throw new UnauthorizedException(
        'Refresh token has been revoked or expired',
      );
    }

    const authHeader = req.get('Authorization');
    const refreshToken =
      refreshTokenFromCookie(req) ??
      (authHeader ? authHeader.replace('Bearer', '').trim() : '');

    return {
      id: user.id,
      email: user.email,
      roles: user.roles,
      jti: payload.jti,
      sessionId: session?.sessionId ?? session?.jti,
      refreshToken,
    };
  }
}
