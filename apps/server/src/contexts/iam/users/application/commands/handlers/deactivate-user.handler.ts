import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { DeactivateUserCommand } from '../deactivate-user.command';
import { UserNotFoundException } from '@iam/users/domain/exceptions/user-not-found.exception';
import { UserSelfMutationForbiddenException } from '@iam/users/domain/exceptions/user-self-mutation-forbidden.exception';
import { Result } from '@shared/domain/result';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '@iam/users/domain/ports/user.repository';
import { LastAdministratorRequiredException } from '@iam/users/domain/exceptions/last-administrator-required.exception';

@CommandHandler(DeactivateUserCommand)
export class DeactivateUserCommandHandler implements ICommandHandler<
  DeactivateUserCommand,
  Result<void, DomainException>
> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
  ) {}

  async execute(
    command: DeactivateUserCommand,
  ): Promise<Result<void, DomainException>> {
    const { id, adminId } = command;

    if (id === adminId) {
      return Result.fail(new UserSelfMutationForbiddenException('deactivate'));
    }

    const user = await this.userRepository.findById(id);
    if (!user) {
      return Result.fail(new UserNotFoundException(id));
    }

    user.deactivate(adminId);
    const saved =
      await this.userRepository.savePreservingLastAdministrator(user);
    if (!saved) {
      return Result.fail(new LastAdministratorRequiredException());
    }

    return Result.ok(undefined);
  }
}
