import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { LogoutCommand } from '../logout.command';
import { RedisService } from '@shared/infrastructure/cache/redis.service';
import { Result } from '@shared/domain/result';
import { DomainException } from '@shared/domain/exceptions/domain.exception';

@CommandHandler(LogoutCommand)
export class LogoutCommandHandler implements ICommandHandler<LogoutCommand, Result<void, DomainException>> {
    constructor(private readonly redisService: RedisService) { }

    async execute(command: LogoutCommand): Promise<Result<void, DomainException>> {
        const { userId, jti } = command;
        await this.redisService.del(`refresh_token:${userId}:${jti}`);
        return Result.ok(undefined);
    }
}
