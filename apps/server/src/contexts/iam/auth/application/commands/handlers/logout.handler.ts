import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { LogoutCommand } from '../logout.command';
import { CACHE_PORT } from '@shared/domain/ports/cache.port';
import type { ICachePort } from '@shared/domain/ports/cache.port';
import { Result } from '@shared/domain/result';
import { DomainException } from '@shared/domain/exceptions/domain.exception';

@CommandHandler(LogoutCommand)
export class LogoutCommandHandler implements ICommandHandler<LogoutCommand, Result<void, DomainException>> {
    constructor(
        @Inject(CACHE_PORT)
        private readonly cache: ICachePort,
    ) { }

    async execute(command: LogoutCommand): Promise<Result<void, DomainException>> {
        const { userId, jti } = command;
        await this.cache.del(`refresh_token:${userId}:${jti}`);
        return Result.ok(undefined);
    }
}
