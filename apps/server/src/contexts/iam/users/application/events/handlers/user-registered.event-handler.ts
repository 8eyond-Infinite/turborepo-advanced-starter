import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger, Inject } from '@nestjs/common';
import { UserRegisteredEvent } from '@iam/users/domain/events/user-registered.event';
import { USER_QUEUE, USER_JOBS } from '@iam/users/application/queues/user-queue.constants';
import { JOB_QUEUE_PORT } from '@shared/domain/ports/job-queue.port';
import type { IJobQueuePort } from '@shared/domain/ports/job-queue.port';

@EventsHandler(UserRegisteredEvent)
export class UserRegisteredEventHandler implements IEventHandler<UserRegisteredEvent> {
    private readonly logger = new Logger(UserRegisteredEventHandler.name);

    constructor(
        @Inject(JOB_QUEUE_PORT)
        private readonly jobQueue: IJobQueuePort,
    ) {}

    async handle(event: UserRegisteredEvent) {
        this.logger.log(`Received UserRegisteredEvent for email ${event.email}. Dispatching welcome email job...`);
        try {
            await this.jobQueue.addJob(USER_QUEUE, USER_JOBS.SEND_WELCOME_EMAIL, { email: event.email });
        } catch (error: any) {
            this.logger.error(`Failed to dispatch welcome email job for ${event.email}: ${error.message}`);
        }
    }
}
