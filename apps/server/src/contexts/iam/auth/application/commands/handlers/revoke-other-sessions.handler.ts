import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { Result } from '@shared/domain/result';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import {
  SESSION_STORE,
  type ISessionStore,
} from '../../ports/session-store.port';
import { RevokeOtherSessionsCommand } from '../revoke-other-sessions.command';

@CommandHandler(RevokeOtherSessionsCommand)
export class RevokeOtherSessionsCommandHandler implements ICommandHandler<
  RevokeOtherSessionsCommand,
  Result<void, DomainException>
> {
  constructor(
    @Inject(SESSION_STORE)
    private readonly sessionStore: ISessionStore,
  ) {}

  async execute(
    command: RevokeOtherSessionsCommand,
  ): Promise<Result<void, DomainException>> {
    await this.sessionStore.revokeOtherUserSessions(
      command.userId,
      command.currentSessionId,
    );
    return Result.ok(undefined);
  }
}
