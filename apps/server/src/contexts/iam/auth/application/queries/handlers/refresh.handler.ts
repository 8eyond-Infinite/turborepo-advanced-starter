import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RefreshQuery } from '../refresh.query';
import { SESSION_STORE, ISessionStore } from '../../../domain/ports/session-store.port';
import { Result } from '@shared/domain/result';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import type { UserRepository } from '@iam/users/domain/ports/user.repository';

@QueryHandler(RefreshQuery)
export class RefreshQueryHandler implements IQueryHandler<RefreshQuery, Result<{ accessToken: string; refreshToken: string }, DomainException>> {
    constructor(
        private readonly jwtService: JwtService,
        @Inject('UserRepository')
        private readonly userRepository: UserRepository,
        @Inject(SESSION_STORE)
        private readonly sessionStore: ISessionStore,
    ) { }

    async execute(query: RefreshQuery): Promise<Result<{ accessToken: string; refreshToken: string }, DomainException>> {
        const { userId, email, jti: oldJti } = query;

        const permissions = await this.userRepository.getPermissions(userId);
        const newJti = this.userRepository.nextIdentity();
        const accessPayload = { sub: userId, email, permissions };
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

        const oldData = await this.sessionStore.getRefreshTokenSession(userId, oldJti);
        if (oldData) {
            sessionData = {
                ...oldData,
                jti: newJti,
            };
        }

        await this.sessionStore.saveRefreshToken(userId, newJti, sessionData, 604800);
        await this.sessionStore.revokeRefreshToken(userId, oldJti);

        return Result.ok({ accessToken, refreshToken });
    }
}

