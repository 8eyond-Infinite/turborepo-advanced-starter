import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { LogoutAllCommand } from '../logout-all.command';
import { SESSION_STORE, ISessionStore } from '../../../domain/ports/session-store.port';
import { Result } from '@shared/domain/result';
import { DomainException } from '@shared/domain/exceptions/domain.exception';

@CommandHandler(LogoutAllCommand)
export class LogoutAllCommandHandler implements ICommandHandler<LogoutAllCommand, Result<void, DomainException>> {
    constructor(
        @Inject(SESSION_STORE)
        private readonly sessionStore: ISessionStore,
    ) { }

    async execute(command: LogoutAllCommand): Promise<Result<void, DomainException>> {
        const { userId } = command;
        await this.sessionStore.revokeAllUserSessions(userId);
        return Result.ok(undefined);
    }
}

