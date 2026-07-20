import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger, Inject } from '@nestjs/common';
import { UserDeactivatedEvent } from '@iam/users/domain/events/user-deactivated.event';
import { USER_QUEUE, USER_JOBS } from '@iam/users/application/queues/user-queue.constants';
import { CACHE_PORT } from '@shared/domain/ports/cache.port';
import type { ICachePort } from '@shared/domain/ports/cache.port';
import { JOB_QUEUE_PORT } from '@shared/domain/ports/job-queue.port';
import type { IJobQueuePort } from '@shared/domain/ports/job-queue.port';

@EventsHandler(UserDeactivatedEvent)
export class UserDeactivatedEventHandler implements IEventHandler<UserDeactivatedEvent> {
    private readonly logger = new Logger(UserDeactivatedEventHandler.name);

    constructor(
        @Inject(CACHE_PORT)
        private readonly cache: ICachePort,
        @Inject(JOB_QUEUE_PORT)
        private readonly jobQueue: IJobQueuePort,
    ) { }

    async handle(event: UserDeactivatedEvent) {
        const { userId, email } = event;
        this.logger.log(`Received UserDeactivatedEvent for user ${email} (ID: ${userId}). Revoking sessions...`);

        // 1. Invalidate all active sessions in Redis (Critical Security Action)
        await this.cache.invalidatePattern(`refresh_token:${userId}:*`);
        this.logger.log(`Successfully revoked tokens for user ${email}`);

        // 2. Dispatch deactivation email job (Secondary action - wrapped in try-catch to preserve fault tolerance)
        try {
            await this.jobQueue.addJob(USER_QUEUE, USER_JOBS.SEND_DEACTIVATION_EMAIL, { email });
            this.logger.log(`Dispatched deactivation email job for ${email}`);
        } catch (error: any) {
            this.logger.error(`Failed to dispatch deactivation email job for ${email}: ${error.message}`);
        }
    }
}
