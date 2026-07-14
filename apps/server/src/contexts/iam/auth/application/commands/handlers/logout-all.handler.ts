import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { LogoutAllCommand } from '../logout-all.command';
import { RedisService } from '@shared/infrastructure/cache/redis.service';
import { Result } from '@shared/domain/result';
import { DomainException } from '@shared/domain/exceptions/domain.exception';

@CommandHandler(LogoutAllCommand)
export class LogoutAllCommandHandler implements ICommandHandler<LogoutAllCommand, Result<void, DomainException>> {
    constructor(private readonly redisService: RedisService) { }

    async execute(command: LogoutAllCommand): Promise<Result<void, DomainException>> {
        const { userId } = command;
        await this.redisService.invalidatePattern(`refresh_token:${userId}:*`);
        return Result.ok(undefined);
    }
}
