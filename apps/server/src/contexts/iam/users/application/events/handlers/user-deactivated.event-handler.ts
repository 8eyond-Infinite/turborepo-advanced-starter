import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { UserDeactivatedEvent } from '@iam/users/domain/events/user-deactivated.event';
import { RedisService } from '@shared/infrastructure/cache/redis.service';
import { USER_QUEUE, USER_JOBS } from '@iam/users/application/queues/user-queue.constants';
import { RealtimeService } from '@shared/infrastructure/realtime/realtime.service';

@EventsHandler(UserDeactivatedEvent)
export class UserDeactivatedEventHandler implements IEventHandler<UserDeactivatedEvent> {
    private readonly logger = new Logger(UserDeactivatedEventHandler.name);

    constructor(
        private readonly redisService: RedisService,
        @InjectQueue(USER_QUEUE)
        private readonly userQueue: Queue,
        private readonly realtimeService: RealtimeService,
    ) { }

    async handle(event: UserDeactivatedEvent) {
        const { userId, email } = event;
        this.logger.log(`Received UserDeactivatedEvent for user ${email} (ID: ${userId}). Revoking sessions...`);

        await this.redisService.invalidatePattern(`refresh_token:${userId}:*`);
        this.logger.log(`Successfully revoked tokens for user ${email}`);

        this.realtimeService.sendToUser(userId, 'force_logout', {
            message: 'Tài khoản của bạn đã bị khóa hoặc thu hồi quyền truy cập.',
        });

        await this.userQueue.add(USER_JOBS.SEND_DEACTIVATION_EMAIL, { email });
        this.logger.log(`Dispatched deactivation email job for ${email}`);
    }
}
