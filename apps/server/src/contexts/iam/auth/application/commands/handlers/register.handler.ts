import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { RegisterCommand } from '../register.command';
import { UserEntity } from '@iam/users/domain/user.entity';
import { UserAlreadyExistsException } from '@iam/users/domain/exceptions/user-already-exists.exception';
import { Result } from '@shared/domain/result';
import { DomainException } from '@shared/domain/exceptions/domain.exception';

import {
  USER_REPOSITORY,
  type UserRepository,
} from '@iam/users/domain/ports/user.repository';
import {
  PASSWORD_HASHER,
  type PasswordHasher,
} from '@iam/users/domain/ports/password-hasher';

@CommandHandler(RegisterCommand)
export class RegisterHandler implements ICommandHandler<
  RegisterCommand,
  Result<UserEntity, DomainException>
> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async execute(
    command: RegisterCommand,
  ): Promise<Result<UserEntity, DomainException>> {
    const { email, username, passwordRaw } = command;

    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      return Result.fail(new UserAlreadyExistsException(email));
    }

    const passwordHash = await this.passwordHasher.hash(passwordRaw);

    const user = UserEntity.register({
      id: this.userRepository.nextIdentity(),
      email,
      username,
      passwordHash,
    });

    await this.userRepository.save(user);

    return Result.ok(user);
  }
}
