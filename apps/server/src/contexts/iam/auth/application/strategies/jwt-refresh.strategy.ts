import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { SESSION_STORE, ISessionStore } from '../../domain/ports/session-store.port';
import type { UserRepository } from '@iam/users/domain/ports/user.repository';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
    constructor(
        @Inject('UserRepository')
        private readonly userRepository: UserRepository,
        @Inject(SESSION_STORE)
        private readonly sessionStore: ISessionStore,
        private readonly configService: ConfigService,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('JWT_REFRESH_SECRET') || 'secret-refresh',
            passReqToCallback: true,
        });
    }

    async validate(req: Request, payload: { sub: string; email: string; jti: string }) {
        const user = await this.userRepository.findById(payload.sub);
        if (!user || !user.isActive || user.isDeleted) {
            throw new UnauthorizedException('User is inactive or no longer exists');
        }

        const isValid = await this.sessionStore.isRefreshTokenValid(payload.sub, payload.jti);
        if (!isValid) {
            throw new UnauthorizedException('Refresh token has been revoked or expired');
        }

        const authHeader = req.get('Authorization');
        const refreshToken = authHeader ? authHeader.replace('Bearer', '').trim() : '';

        return {
            id: user.id,
            email: user.email,
            roles: user.roles,
            jti: payload.jti,
            refreshToken,
        };
    }
}

