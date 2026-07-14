import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RefreshQuery } from '../refresh.query';
import { RedisService } from '@shared/infrastructure/cache/redis.service';
import { Result } from '@shared/domain/result';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import type { UserRepository } from '@iam/users/domain/ports/user.repository';

@QueryHandler(RefreshQuery)
export class RefreshQueryHandler implements IQueryHandler<RefreshQuery, Result<{ accessToken: string; refreshToken: string }, DomainException>> {
    constructor(
        private readonly jwtService: JwtService,
        @Inject('UserRepository')
        private readonly userRepository: UserRepository,
        private readonly redisService: RedisService,
    ) { }

    async execute(query: RefreshQuery): Promise<Result<{ accessToken: string; refreshToken: string }, DomainException>> {
        const { userId, email, jti: oldJti } = query;

        const newJti = this.userRepository.nextIdentity();
        const accessPayload = { sub: userId, email };
        const refreshPayload = { sub: userId, email, jti: newJti };

        const accessToken = this.jwtService.sign(accessPayload, {
            secret: process.env.JWT_ACCESS_SECRET,
            expiresIn: '15m',
        });

        const refreshToken = this.jwtService.sign(refreshPayload, {
            secret: process.env.JWT_REFRESH_SECRET,
            expiresIn: '7d',
        });

        // Store new refresh token in Redis
        await this.redisService.set(`refresh_token:${userId}:${newJti}`, '1', 604800);

        // Delete old refresh token (rotation)
        await this.redisService.del(`refresh_token:${userId}:${oldJti}`);

        return Result.ok({ accessToken, refreshToken });
    }
}
