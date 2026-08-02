import { DomainEvent } from './events/domain-event';

export abstract class AggregateRoot {
  private readonly _domainEvents: DomainEvent[] = [];

  protected addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event);
  }

  public getDomainEvents(): readonly DomainEvent[] {
    return [...this._domainEvents];
  }

  public clearDomainEvents(): void {
    this._domainEvents.length = 0;
  }

  public pullDomainEvents(): DomainEvent[] {
    const events = [...this.getDomainEvents()];
    this.clearDomainEvents();
    return events;
  }
}
