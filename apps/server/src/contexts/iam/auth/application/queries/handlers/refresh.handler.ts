import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RefreshQuery } from '../refresh.query';
import { CACHE_PORT } from '@shared/domain/ports/cache.port';
import type { ICachePort } from '@shared/domain/ports/cache.port';
import { Result } from '@shared/domain/result';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import type { UserRepository } from '@iam/users/domain/ports/user.repository';

@QueryHandler(RefreshQuery)
export class RefreshQueryHandler implements IQueryHandler<RefreshQuery, Result<{ accessToken: string; refreshToken: string }, DomainException>> {
    constructor(
        private readonly jwtService: JwtService,
        @Inject('UserRepository')
        private readonly userRepository: UserRepository,
        @Inject(CACHE_PORT)
        private readonly cache: ICachePort,
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

        let sessionData = {
            jti: newJti,
            ip: 'Unknown',
            userAgent: 'Unknown',
            createdAt: new Date().toISOString(),
        };

        const oldData = await this.cache.get<any>(`refresh_token:${userId}:${oldJti}`);
        if (oldData && oldData !== '1' && typeof oldData === 'object') {
            sessionData = {
                ...oldData,
                jti: newJti, // Update JTI
            };
        }

        await this.cache.set(`refresh_token:${userId}:${newJti}`, sessionData, 604800);

        await this.cache.del(`refresh_token:${userId}:${oldJti}`);

        return Result.ok({ accessToken, refreshToken });
    }
}
