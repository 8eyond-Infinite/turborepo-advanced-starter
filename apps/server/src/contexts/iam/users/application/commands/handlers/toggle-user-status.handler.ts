import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { ToggleUserStatusCommand } from '../toggle-user-status.command';
import { Result } from '@shared/domain/result';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { UserNotFoundException } from '@iam/users/domain/exceptions/user-not-found.exception';
import { UserSelfMutationForbiddenException } from '@iam/users/domain/exceptions/user-self-mutation-forbidden.exception';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '@iam/users/domain/ports/user.repository';
import { LastAdministratorRequiredException } from '@iam/users/domain/exceptions/last-administrator-required.exception';

@CommandHandler(ToggleUserStatusCommand)
export class ToggleUserStatusCommandHandler implements ICommandHandler<
  ToggleUserStatusCommand,
  Result<void, DomainException>
> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
  ) {}

  async execute(
    command: ToggleUserStatusCommand,
  ): Promise<Result<void, DomainException>> {
    const { id, adminId } = command;

    if (id === adminId) {
      return Result.fail(
        new UserSelfMutationForbiddenException('toggle-status'),
      );
    }

    const user = await this.userRepository.findById(id);
    if (!user) {
      return Result.fail(new UserNotFoundException(id));
    }

    if (user.isActive) {
      user.deactivate(adminId);
    } else {
      user.activate(adminId);
    }

    const saved =
      await this.userRepository.savePreservingLastAdministrator(user);
    if (!saved) {
      return Result.fail(new LastAdministratorRequiredException());
    }

    return Result.ok(undefined);
  }
}
