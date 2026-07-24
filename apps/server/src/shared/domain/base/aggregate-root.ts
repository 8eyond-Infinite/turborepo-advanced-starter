import { DomainEvent } from '../events/domain-event';

export abstract class AggregateRoot {
    private readonly _domainEvents: DomainEvent[] = [];

    protected addDomainEvent(event: DomainEvent): void {
        this._domainEvents.push(event);
    }

    public pullDomainEvents(): DomainEvent[] {
        const events = [...this._domainEvents];
        this._domainEvents.length = 0;
        return events;
    }
}
