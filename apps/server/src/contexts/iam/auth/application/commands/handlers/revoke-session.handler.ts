import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { RevokeSessionCommand } from '../revoke-session.command';
import { CACHE_PORT } from '@shared/domain/ports/cache.port';
import type { ICachePort } from '@shared/domain/ports/cache.port';
import { Result } from '@shared/domain/result';
import { DomainException } from '@shared/domain/exceptions/domain.exception';

@CommandHandler(RevokeSessionCommand)
export class RevokeSessionCommandHandler implements ICommandHandler<RevokeSessionCommand, Result<void, DomainException>> {
    constructor(
        @Inject(CACHE_PORT)
        private readonly cache: ICachePort,
    ) { }

    async execute(command: RevokeSessionCommand): Promise<Result<void, DomainException>> {
        const { userId, jti } = command;
        await this.cache.del(`refresh_token:${userId}:${jti}`);
        return Result.ok(undefined);
    }
}
