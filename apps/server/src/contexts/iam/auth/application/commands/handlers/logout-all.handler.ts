import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { LogoutAllCommand } from '../logout-all.command';
import { CACHE_PORT } from '@shared/domain/ports/cache.port';
import type { ICachePort } from '@shared/domain/ports/cache.port';
import { Result } from '@shared/domain/result';
import { DomainException } from '@shared/domain/exceptions/domain.exception';

@CommandHandler(LogoutAllCommand)
export class LogoutAllCommandHandler implements ICommandHandler<LogoutAllCommand, Result<void, DomainException>> {
    constructor(
        @Inject(CACHE_PORT)
        private readonly cache: ICachePort,
    ) { }

    async execute(command: LogoutAllCommand): Promise<Result<void, DomainException>> {
        const { userId } = command;
        await this.cache.invalidatePattern(`refresh_token:${userId}:*`);
        return Result.ok(undefined);
    }
}
