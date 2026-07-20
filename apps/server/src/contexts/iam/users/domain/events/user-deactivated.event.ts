import { DomainEvent } from '@shared/domain/events/domain-event';
import type { IRealtimeEvent } from '@shared/domain/events/realtime-event.interface';
import type { ICacheInvalidationEvent } from '@shared/domain/events/cache-invalidation-event.interface';
import type { IQueueEvent } from '@shared/domain/events/queue-event.interface';
import { USER_QUEUE, USER_JOBS } from '@iam/users/application/queues/user-queue.constants';

export class UserDeactivatedEvent extends DomainEvent implements IRealtimeEvent, ICacheInvalidationEvent, IQueueEvent {
    constructor(
        public readonly userId: string,
        public readonly email: string,
    ) {
        super();
    }

    getRealtimeEventName(): string {
        return 'force_logout';
    }

    getTargetUserId(): string | null {
        return this.userId;
    }

    toRealtimePayload(): any {
        return {
            message: 'Tài khoản của bạn đã bị khóa hoặc thu hồi quyền truy cập.',
        };
    }

    getCacheKeysToInvalidate(): string[] {
        return [];
    }

    getCachePatternsToInvalidate(): string[] {
        return [`refresh_token:${this.userId}:*`];
    }

    getQueueName(): string {
        return USER_QUEUE;
    }

    getJobName(): string {
        return USER_JOBS.SEND_DEACTIVATION_EMAIL;
    }

    toJobData(): any {
        return { email: this.email };
    }
}
