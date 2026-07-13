import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoginQuery } from '../login.query';
import { InvalidCredentialsException } from '@iam/users/domain/exceptions/invalid-credentials.exception';
import { UserDeactivatedException } from '@iam/users/domain/exceptions/user-deactivated.exception';
import { Result } from '@shared/domain/result';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
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

        const payload = { sub: user.id, email: user.email };

        const accessToken = this.jwtService.sign(payload, {
            secret: process.env.JWT_ACCESS_SECRET,
            expiresIn: '15m',
        });

        const refreshToken = this.jwtService.sign(payload, {
            secret: process.env.JWT_REFRESH_SECRET,
            expiresIn: '7d',
        });

        return Result.ok({ accessToken, refreshToken });
    }
}