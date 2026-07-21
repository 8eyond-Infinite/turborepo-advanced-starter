import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { CreateUserCommand } from '../create-user.command';
import { UserEntity } from '@iam/users/domain/user.entity';
import { Result } from '@shared/domain/result';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { UserAlreadyExistsException } from '@iam/users/domain/exceptions/user-already-exists.exception';
import type { UserRepository } from '@iam/users/domain/ports/user.repository';
import type { PasswordHasher } from '@iam/users/domain/ports/password-hasher';

@CommandHandler(CreateUserCommand)
export class CreateUserCommandHandler implements ICommandHandler<CreateUserCommand, Result<UserEntity, DomainException>> {
    constructor(
        @Inject('UserRepository')
        private readonly userRepository: UserRepository,
        @Inject('PasswordHasher')
        private readonly passwordHasher: PasswordHasher,
    ) { }

    async execute(command: CreateUserCommand): Promise<Result<UserEntity, DomainException>> {
        const { email, username, passwordHash, roles, avatar, createdBy } = command;

        const existing = await this.userRepository.findByEmail(email);
        if (existing) {
            return Result.fail(new UserAlreadyExistsException(email));
        }

        const hashedPassword = await this.passwordHasher.hash(passwordHash);

        const user = UserEntity.register({
            id: this.userRepository.nextIdentity(),
            email,
            username,
            passwordHash: hashedPassword,
            avatar,
            roles,
            createdBy,
        });

        await this.userRepository.save(user);

        return Result.ok(user);
    }
}
