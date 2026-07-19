import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '@shared/infrastructure/cache/redis.service';
import type { UserRepository } from '@iam/users/domain/ports/user.repository';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
    constructor(
        @Inject('UserRepository')
        private readonly userRepository: UserRepository,
        private readonly redisService: RedisService,
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

        const key = `refresh_token:${payload.sub}:${payload.jti}`;
        const isValid = await this.redisService.get<string>(key);
        if (!isValid) {
            throw new UnauthorizedException('Refresh token has been revoked or expired');
        }

        const authHeader = req.get('Authorization');
        const refreshToken = authHeader ? authHeader.replace('Bearer', '').trim() : '';

        return {
            user,
            refreshToken,
            jti: payload.jti,
        };
    }
}
