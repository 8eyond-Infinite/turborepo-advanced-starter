import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { CreateUserCommand } from '../create-user.command';
import { UserEntity } from '@iam/users/domain/user.entity';
import { Result } from '@shared/domain/result';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { UserAlreadyExistsException } from '@iam/users/domain/exceptions/user-already-exists.exception';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '@iam/users/domain/ports/user.repository';
import {
  PASSWORD_HASHER,
  type PasswordHasher,
} from '@iam/users/application/ports/password-hasher.port';
import { InvalidUserRolesException } from '@iam/users/domain/exceptions/invalid-user-roles.exception';

@CommandHandler(CreateUserCommand)
export class CreateUserCommandHandler implements ICommandHandler<
  CreateUserCommand,
  Result<UserEntity, DomainException>
> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async execute(
    command: CreateUserCommand,
  ): Promise<Result<UserEntity, DomainException>> {
    const { email, username, passwordHash, roles, avatar, createdBy } = command;

    const existing = await this.userRepository.findByEmail(email);
    if (existing) {
      return Result.fail(new UserAlreadyExistsException(email));
    }

    const uniqueRoles = [...new Set(roles)];
    const existingRoles =
      await this.userRepository.findExistingRoleNames(uniqueRoles);
    const unknownRoles = uniqueRoles.filter(
      (role) => !existingRoles.includes(role),
    );
    if (uniqueRoles.length === 0 || unknownRoles.length > 0) {
      return Result.fail(new InvalidUserRolesException(unknownRoles));
    }

    const hashedPassword = await this.passwordHasher.hash(passwordHash);

    const user = UserEntity.register({
      id: this.userRepository.nextIdentity(),
      email,
      username,
      passwordHash: hashedPassword,
      avatar,
      roles: uniqueRoles,
      createdBy,
    });

    await this.userRepository.save(user);

    return Result.ok(user);
  }
}
