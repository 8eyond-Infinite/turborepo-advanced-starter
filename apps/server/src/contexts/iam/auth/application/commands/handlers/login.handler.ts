import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoginCommand } from '../login.command';
import { InvalidCredentialsException } from '@iam/users/domain/exceptions/invalid-credentials.exception';
import { UserDeactivatedException } from '@iam/users/domain/exceptions/user-deactivated.exception';
import { Result } from '@shared/domain/result';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { SESSION_STORE, ISessionStore } from '../../../domain/ports/session-store.port';
import type { UserRepository } from '@iam/users/domain/ports/user.repository';
import type { PasswordHasher } from '@iam/users/domain/ports/password-hasher';

@CommandHandler(LoginCommand)
export class LoginCommandHandler implements ICommandHandler<LoginCommand, Result<{ accessToken: string; refreshToken: string }, DomainException>> {
    constructor(
        @Inject('UserRepository')
        private readonly userRepository: UserRepository,
        @Inject('PasswordHasher')
        private readonly passwordHasher: PasswordHasher,
        private readonly jwtService: JwtService,
        @Inject(SESSION_STORE)
        private readonly sessionStore: ISessionStore,
    ) { }

    async execute(command: LoginCommand): Promise<Result<{ accessToken: string; refreshToken: string }, DomainException>> {
        const { email, passwordRaw } = command;

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

        const permissions = await this.userRepository.getPermissions(user.id);
        const jti = this.userRepository.nextIdentity();
        const accessPayload = { sub: user.id, email: user.email, permissions };
        const refreshPayload = { sub: user.id, email: user.email, jti };

        const accessToken = this.jwtService.sign(accessPayload, {
            secret: process.env.JWT_ACCESS_SECRET,
            expiresIn: '15m',
        });

        const refreshToken = this.jwtService.sign(refreshPayload, {
            secret: process.env.JWT_REFRESH_SECRET,
            expiresIn: '7d',
        });

        const sessionData = {
            jti,
            ip: command.ip || 'Unknown',
            userAgent: command.userAgent || 'Unknown',
            createdAt: new Date().toISOString(),
        };
        await this.sessionStore.saveRefreshToken(user.id, jti, sessionData, 604800);

        return Result.ok({ accessToken, refreshToken });
    }
}