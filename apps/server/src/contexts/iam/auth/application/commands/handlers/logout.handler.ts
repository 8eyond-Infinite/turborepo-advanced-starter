import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { LogoutCommand } from '../logout.command';
import { SESSION_STORE, ISessionStore } from '../../../domain/ports/session-store.port';
import { Result } from '@shared/domain/result';
import { DomainException } from '@shared/domain/exceptions/domain.exception';

@CommandHandler(LogoutCommand)
export class LogoutCommandHandler implements ICommandHandler<LogoutCommand, Result<void, DomainException>> {
    constructor(
        @Inject(SESSION_STORE)
        private readonly sessionStore: ISessionStore,
    ) { }

    async execute(command: LogoutCommand): Promise<Result<void, DomainException>> {
        const { userId, jti } = command;
        await this.sessionStore.revokeRefreshToken(userId, jti);
        return Result.ok(undefined);
    }
}

