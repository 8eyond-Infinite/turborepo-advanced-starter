import { DomainEvent } from '@shared/domain/events/domain-event';
import type { IRealtimeEvent } from '@shared/domain/events/realtime-event.interface';

export class UserDeactivatedEvent extends DomainEvent implements IRealtimeEvent {
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
}
