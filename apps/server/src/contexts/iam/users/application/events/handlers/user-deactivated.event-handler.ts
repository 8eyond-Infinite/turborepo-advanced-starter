import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { UserDeactivatedEvent } from '@iam/users/domain/events/user-deactivated.event';
import { RedisService } from '@shared/infrastructure/cache/redis.service';
import { USER_QUEUE, USER_JOBS } from '@iam/users/application/queues/user-queue.constants';

@EventsHandler(UserDeactivatedEvent)
export class UserDeactivatedEventHandler implements IEventHandler<UserDeactivatedEvent> {
    private readonly logger = new Logger(UserDeactivatedEventHandler.name);

    constructor(
        private readonly redisService: RedisService,
        @InjectQueue(USER_QUEUE)
        private readonly userQueue: Queue,
    ) { }

    async handle(event: UserDeactivatedEvent) {
        const { userId, email } = event;
        this.logger.log(`Received UserDeactivatedEvent for user ${email} (ID: ${userId}). Revoking sessions...`);

        // 1. Invalidate all active sessions in Redis (Critical Security Action)
        await this.redisService.invalidatePattern(`refresh_token:${userId}:*`);
        this.logger.log(`Successfully revoked tokens for user ${email}`);

        // 2. Dispatch deactivation email job (Secondary action - wrapped in try-catch to preserve fault tolerance)
        try {
            await this.userQueue.add(USER_JOBS.SEND_DEACTIVATION_EMAIL, { email });
            this.logger.log(`Dispatched deactivation email job for ${email}`);
        } catch (error: any) {
            this.logger.error(`Failed to dispatch deactivation email job for ${email}: ${error.message}`);
        }
    }
}
