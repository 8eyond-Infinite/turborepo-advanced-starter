import { DomainEvent } from '@shared/domain/events/domain-event';

export class NotificationCreatedEvent extends DomainEvent {
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
}
