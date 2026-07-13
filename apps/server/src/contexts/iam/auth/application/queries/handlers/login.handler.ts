import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoginQuery } from '../login.query';
import { InvalidCredentialsException } from '@iam/users/domain/exceptions/invalid-credentials.exception';
import { UserDeactivatedException } from '@iam/users/domain/exceptions/user-deactivated.exception';
import type { UserRepository } from '@iam/users/domain/ports/user.repository';
import type { PasswordHasher } from '@iam/users/domain/ports/password-hasher';

@QueryHandler(LoginQuery)
export class LoginQueryHandler implements IQueryHandler<LoginQuery> {
    constructor(
        @Inject('UserRepository')
        private readonly userRepository: UserRepository,
        @Inject('PasswordHasher')
        private readonly passwordHasher: PasswordHasher,
        private readonly jwtService: JwtService,
    ) { }

    async execute(query: LoginQuery): Promise<{ accessToken: string; refreshToken: string }> {
        const { email, passwordRaw } = query;

        const user = await this.userRepository.findByEmail(email);
        if (!user) {
            throw new InvalidCredentialsException();
        }

        if (!user.isActive) {
            throw new UserDeactivatedException(email);
        }

        const isPasswordValid = await this.passwordHasher.compare(passwordRaw, user.password);
        if (!isPasswordValid) {
            throw new InvalidCredentialsException();
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

        return { accessToken, refreshToken };
    }
}