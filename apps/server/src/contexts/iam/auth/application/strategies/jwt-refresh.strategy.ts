import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import type { UserRepository } from '@iam/users/domain/ports/user.repository';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
    constructor(
        @Inject('UserRepository')
        private readonly userRepository: UserRepository,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: process.env.JWT_REFRESH_SECRET || 'secret-refresh',
            passReqToCallback: true,
        });
    }

    async validate(req: Request, payload: { sub: string; email: string }) {
        const user = await this.userRepository.findById(payload.sub);
        if (!user || !user.isActive || user.isDeleted) {
            throw new UnauthorizedException('User is inactive or no longer exists');
        }
        
        const authHeader = req.get('Authorization');
        const refreshToken = authHeader ? authHeader.replace('Bearer', '').trim() : '';

        return {
            user,
            refreshToken,
        };
    }
}
