import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { UserDeactivatedEvent } from '@iam/users/domain/events/user-deactivated.event';
import { RedisService } from '@shared/infrastructure/cache/redis.service';

@EventsHandler(UserDeactivatedEvent)
export class UserDeactivatedEventHandler implements IEventHandler<UserDeactivatedEvent> {
    private readonly logger = new Logger(UserDeactivatedEventHandler.name);

    constructor(
        private readonly redisService: RedisService,
    ) { }

    async handle(event: UserDeactivatedEvent) {
        const { userId, email } = event;
        this.logger.log(`Received UserDeactivatedEvent for user ${email} (ID: ${userId}). Revoking sessions...`);

        // 1. Invalidate all active sessions (forced logout)
        await this.redisService.invalidatePattern(`refresh_token:${userId}:*`);

        this.logger.log(`Successfully revoked tokens for user ${email}`);
    }
}
