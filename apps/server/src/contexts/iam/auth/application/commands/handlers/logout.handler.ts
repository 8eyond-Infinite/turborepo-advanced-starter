import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { LogoutCommand } from '../logout.command';
import { RedisService } from '@shared/infrastructure/cache/redis.service';

@CommandHandler(LogoutCommand)
export class LogoutCommandHandler implements ICommandHandler<LogoutCommand, void> {
    constructor(private readonly redisService: RedisService) { }

    async execute(command: LogoutCommand): Promise<void> {
        const { userId, jti } = command;
        await this.redisService.del(`refresh_token:${userId}:${jti}`);
    }
}
