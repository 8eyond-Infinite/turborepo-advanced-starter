import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoginQuery } from '../login.query';
import { InvalidCredentialsException } from '@iam/users/domain/exceptions/invalid-credentials.exception';
import { UserDeactivatedException } from '@iam/users/domain/exceptions/user-deactivated.exception';
import { Result } from '@shared/domain/result';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { CACHE_PORT } from '@shared/domain/ports/cache.port';
import type { ICachePort } from '@shared/domain/ports/cache.port';
import type { UserRepository } from '@iam/users/domain/ports/user.repository';
import type { PasswordHasher } from '@iam/users/domain/ports/password-hasher';

@QueryHandler(LoginQuery)
export class LoginQueryHandler implements IQueryHandler<LoginQuery, Result<{ accessToken: string; refreshToken: string }, DomainException>> {
    constructor(
        @Inject('UserRepository')
        private readonly userRepository: UserRepository,
        @Inject('PasswordHasher')
        private readonly passwordHasher: PasswordHasher,
        private readonly jwtService: JwtService,
        @Inject(CACHE_PORT)
        private readonly cache: ICachePort,
    ) { }

    async execute(query: LoginQuery): Promise<Result<{ accessToken: string; refreshToken: string }, DomainException>> {
        const { email, passwordRaw } = query;

        const user = await this.userRepository.findByEmail(email);
        if (!user) {
            return Result.fail(new InvalidCredentialsException());
        }

        if (!user.isActive) {
            return Result.fail(new UserDeactivatedException(email));
        }

        const isPasswordValid = await this.passwordHasher.compare(passwordRaw, user.password);
        if (!isPasswordValid) {
            return Result.fail(new InvalidCredentialsException());
        }

        const jti = this.userRepository.nextIdentity();
        const accessPayload = { sub: user.id, email: user.email };
        const refreshPayload = { sub: user.id, email: user.email, jti };

        const accessToken = this.jwtService.sign(accessPayload, {
            secret: process.env.JWT_ACCESS_SECRET,
            expiresIn: '15m',
        });

        const refreshToken = this.jwtService.sign(refreshPayload, {
            secret: process.env.JWT_REFRESH_SECRET,
            expiresIn: '7d',
        });

        // Store refresh token whitelist in cache with a 7-day TTL and session metadata
        const sessionData = {
            jti,
            ip: query.ip || 'Unknown',
            userAgent: query.userAgent || 'Unknown',
            createdAt: new Date().toISOString(),
        };
        console.log('[LoginQueryHandler] Storing Redis Key:', `refresh_token:${user.id}:${jti}`);
        await this.cache.set(`refresh_token:${user.id}:${jti}`, sessionData, 604800);

        return Result.ok({ accessToken, refreshToken });
    }
}