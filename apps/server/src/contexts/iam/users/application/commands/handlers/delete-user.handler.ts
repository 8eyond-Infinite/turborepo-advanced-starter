import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { DeleteUserCommand } from '../delete-user.command';
import { Result } from '@shared/domain/result';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { UserNotFoundException } from '@iam/users/domain/exceptions/user-not-found.exception';
import { UserSelfMutationForbiddenException } from '@iam/users/domain/exceptions/user-self-mutation-forbidden.exception';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '@iam/users/domain/ports/user.repository';
import { LastAdministratorRequiredException } from '@iam/users/domain/exceptions/last-administrator-required.exception';

@CommandHandler(DeleteUserCommand)
export class DeleteUserCommandHandler implements ICommandHandler<
  DeleteUserCommand,
  Result<void, DomainException>
> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
  ) {}

  async execute(
    command: DeleteUserCommand,
  ): Promise<Result<void, DomainException>> {
    const { id, adminId } = command;

    if (id === adminId) {
      return Result.fail(new UserSelfMutationForbiddenException('delete'));
    }

    const user = await this.userRepository.findById(id);
    if (!user) {
      return Result.fail(new UserNotFoundException(id));
    }

    user.softDelete(adminId);
    const saved =
      await this.userRepository.savePreservingLastAdministrator(user);
    if (!saved) {
      return Result.fail(new LastAdministratorRequiredException());
    }

    return Result.ok(undefined);
  }
}
