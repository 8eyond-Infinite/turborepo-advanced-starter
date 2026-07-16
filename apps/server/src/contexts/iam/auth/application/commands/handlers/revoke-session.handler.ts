import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { RevokeSessionCommand } from '../revoke-session.command';
import { RedisService } from '@shared/infrastructure/cache/redis.service';
import { Result } from '@shared/domain/result';
import { DomainException } from '@shared/domain/exceptions/domain.exception';

@CommandHandler(RevokeSessionCommand)
export class RevokeSessionCommandHandler implements ICommandHandler<RevokeSessionCommand, Result<void, DomainException>> {
    constructor(
        private readonly redisService: RedisService,
    ) { }

    async execute(command: RevokeSessionCommand): Promise<Result<void, DomainException>> {
        const { userId, jti } = command;
        await this.redisService.del(`refresh_token:${userId}:${jti}`);
        return Result.ok(undefined);
    }
}
