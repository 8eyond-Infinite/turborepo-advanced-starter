import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Logger } from '@nestjs/common';
import { UserRegisteredEvent } from '@iam/users/domain/events/user-registered.event';
import { USER_QUEUE, USER_JOBS } from '@iam/users/application/queues/user-queue.constants';

@EventsHandler(UserRegisteredEvent)
export class UserRegisteredEventHandler implements IEventHandler<UserRegisteredEvent> {
    private readonly logger = new Logger(UserRegisteredEventHandler.name);

    constructor(
        @InjectQueue(USER_QUEUE)
        private readonly userQueue: Queue,
    ) {}

    async handle(event: UserRegisteredEvent) {
        this.logger.log(`Received UserRegisteredEvent for email ${event.email}. Dispatching welcome email job...`);
        await this.userQueue.add(USER_JOBS.SEND_WELCOME_EMAIL, { email: event.email });
    }
}
