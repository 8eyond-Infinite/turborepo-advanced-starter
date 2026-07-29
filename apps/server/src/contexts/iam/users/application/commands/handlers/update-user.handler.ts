import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { UpdateUserCommand } from '../update-user.command';
import { Result } from '@shared/domain/result';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { UserNotFoundException } from '@iam/users/domain/exceptions/user-not-found.exception';
import { UserAlreadyExistsException } from '@iam/users/domain/exceptions/user-already-exists.exception';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '@iam/users/domain/ports/user.repository';
import { LastAdministratorRequiredException } from '@iam/users/domain/exceptions/last-administrator-required.exception';
import { InvalidUserRolesException } from '@iam/users/domain/exceptions/invalid-user-roles.exception';

@CommandHandler(UpdateUserCommand)
export class UpdateUserCommandHandler implements ICommandHandler<
  UpdateUserCommand,
  Result<void, DomainException>
> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
  ) {}

  async execute(
    command: UpdateUserCommand,
  ): Promise<Result<void, DomainException>> {
    const { id, email, username, roles, avatar, updatedBy } = command;

    const user = await this.userRepository.findById(id);
    if (!user) {
      return Result.fail(new UserNotFoundException(id));
    }

    const existing = await this.userRepository.findByEmail(email);
    if (existing && existing.id !== id) {
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

    user.updateInfo(email, username, avatar, updatedBy);
    user.updateRoles(uniqueRoles, updatedBy);

    const saved =
      await this.userRepository.savePreservingLastAdministrator(user);
    if (!saved) {
      return Result.fail(new LastAdministratorRequiredException());
    }

    return Result.ok(undefined);
  }
}
