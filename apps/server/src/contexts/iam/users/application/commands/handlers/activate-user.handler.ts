import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UserNotFoundException } from '@iam/users/domain/exceptions/user-not-found.exception';
import { UserSelfMutationForbiddenException } from '@iam/users/domain/exceptions/user-self-mutation-forbidden.exception';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '@iam/users/domain/ports/user.repository';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result } from '@shared/domain/result';
import { ActivateUserCommand } from '../activate-user.command';

@CommandHandler(ActivateUserCommand)
export class ActivateUserCommandHandler implements ICommandHandler<
  ActivateUserCommand,
  Result<void, DomainException>
> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
  ) {}

  async execute(
    command: ActivateUserCommand,
  ): Promise<Result<void, DomainException>> {
    const { id, adminId } = command;

    if (id === adminId) {
      return Result.fail(new UserSelfMutationForbiddenException('activate'));
    }

    const user = await this.userRepository.findById(id);
    if (!user) {
      return Result.fail(new UserNotFoundException(id));
    }

    user.activate(adminId);
    await this.userRepository.save(user);

    return Result.ok(undefined);
  }
}
