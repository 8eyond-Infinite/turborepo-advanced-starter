import { DomainEvent } from '@shared/domain/events/domain-event';
import type { IQueueEvent } from '@shared/domain/events/queue-event.interface';
import { USER_QUEUE, USER_JOBS } from '@iam/users/application/queues/user-queue.constants';

export class UserRegisteredEvent extends DomainEvent implements IQueueEvent {
    constructor(
        public readonly userId: string,
        public readonly email: string,
        public readonly username: string,
    ) {
        super();
    }

    getQueueName(): string {
        return USER_QUEUE;
    }

    getJobName(): string {
        return USER_JOBS.SEND_WELCOME_EMAIL;
    }

    toJobData(): any {
        return { email: this.email };
    }
}
