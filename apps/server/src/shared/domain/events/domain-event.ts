import { randomUUID } from 'node:crypto';

export abstract class DomainEvent {
  public readonly eventId = randomUUID();
  public readonly occurredOn = new Date();
}
