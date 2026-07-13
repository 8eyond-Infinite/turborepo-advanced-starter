import { Injectable } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { DomainEvent } from '@shared/domain/events/domain-event';

export interface CanEmitEvents {
    pullDomainEvents(): DomainEvent[];
}

@Injectable()
export class DomainEventDispatcher {
    constructor(private readonly eventBus: EventBus) {}

    async dispatch(entity: CanEmitEvents): Promise<void> {
        const events = entity.pullDomainEvents();
        for (const event of events) {
            this.eventBus.publish(event);
        }
    }
}
