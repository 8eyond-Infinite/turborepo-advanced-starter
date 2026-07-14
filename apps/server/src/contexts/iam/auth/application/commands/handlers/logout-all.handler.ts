import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { LogoutAllCommand } from '../logout-all.command';
import { RedisService } from '@shared/infrastructure/cache/redis.service';

@CommandHandler(LogoutAllCommand)
export class LogoutAllCommandHandler implements ICommandHandler<LogoutAllCommand, void> {
    constructor(private readonly redisService: RedisService) { }

    async execute(command: LogoutAllCommand): Promise<void> {
        const { userId } = command;
        await this.redisService.invalidatePattern(`refresh_token:${userId}:*`);
    }
}
