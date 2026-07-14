import { DomainEvent } from '@shared/domain/events/domain-event';

export class UserDeactivatedEvent extends DomainEvent {
    constructor(
        public readonly userId: string,
        public readonly email: string,
    ) {
        super();
    }
}
