import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { RevokeSessionCommand } from '../revoke-session.command';
import { SESSION_STORE, ISessionStore } from '../../../domain/ports/session-store.port';
import { Result } from '@shared/domain/result';
import { DomainException } from '@shared/domain/exceptions/domain.exception';

@CommandHandler(RevokeSessionCommand)
export class RevokeSessionCommandHandler implements ICommandHandler<RevokeSessionCommand, Result<void, DomainException>> {
    constructor(
        @Inject(SESSION_STORE)
        private readonly sessionStore: ISessionStore,
    ) { }

    async execute(command: RevokeSessionCommand): Promise<Result<void, DomainException>> {
        const { userId, jti } = command;
        await this.sessionStore.revokeRefreshToken(userId, jti);
        return Result.ok(undefined);
    }
}

