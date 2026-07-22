import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import type { UserRepository } from '@iam/users/domain/ports/user.repository';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
    constructor(
        @Inject('UserRepository')
        private readonly userRepository: UserRepository,
        private readonly configService: ConfigService,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('JWT_ACCESS_SECRET') || 'secret',
        });
    }

    async validate(payload: { sub: string; email: string; permissions?: string[] }) {
        const user = await this.userRepository.findById(payload.sub);
        if (!user || !user.isActive || user.isDeleted) {
            throw new UnauthorizedException('User is inactive or no longer exists');
        }
        (user as any).permissions = payload.permissions || [];
        return user;
    }
}
