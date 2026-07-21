import { DomainEvent } from '@shared/domain/events/domain-event';
import type { IRealtimeEvent } from '@shared/domain/events/realtime-event.interface';

export class NotificationCreatedEvent extends DomainEvent implements IRealtimeEvent {
    constructor(
        public readonly id: string,
        public readonly userId: string,
        public readonly title: string,
        public readonly content: string,
        public readonly type: string,
        public readonly isRead: boolean,
        public readonly createdAt: Date,
    ) {
        super();
    }

    getRealtimeEventName(): string {
        return 'notification_received';
    }

    getTargetUserId(): string | null {
        return this.userId;
    }

    toRealtimePayload(): any {
        return {
            id: this.id,
            userId: this.userId,
            title: this.title,
            content: this.content,
            type: this.type,
            isRead: this.isRead,
            createdAt: this.createdAt,
        };
    }
}
