import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { LogoutAllCommand } from '../logout-all.command';
import { SESSION_STORE, ISessionStore } from '../../ports/session-store.port';
import {
  USER_REPOSITORY,
  UserRepository,
} from '../../../../users/domain/ports/user.repository';
import { Result } from '@shared/domain/result';
import { DomainException } from '@shared/domain/exceptions/domain.exception';

@CommandHandler(LogoutAllCommand)
export class LogoutAllCommandHandler implements ICommandHandler<
  LogoutAllCommand,
  Result<void, DomainException>
> {
  constructor(
    @Inject(SESSION_STORE)
    private readonly sessionStore: ISessionStore,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
  ) {}

  async execute(
    command: LogoutAllCommand,
  ): Promise<Result<void, DomainException>> {
    const { userId } = command;

    // Revoke refresh sessions AND bump tokenVersion so access tokens already
    // in the wild die immediately instead of surviving until their TTL.
    await this.sessionStore.revokeAllUserSessions(userId);

    const user = await this.userRepository.findById(userId);
    if (user) {
      user.logoutEverywhere();
      await this.userRepository.save(user);
    }

    return Result.ok(undefined);
  }
}
