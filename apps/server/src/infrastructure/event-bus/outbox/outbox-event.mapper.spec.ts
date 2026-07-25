import { UserRegisteredEvent } from '@iam/users/domain/events/user-registered.event';
import {
  OUTBOX_EVENT_TYPES,
  rehydrateDomainEvent,
  serializeDomainEvent,
} from './outbox-event.mapper';

describe('outbox event mapper', () => {
  it('round-trips a supported domain event while preserving identity', () => {
    const original = new UserRegisteredEvent(
      'user-id',
      'user@example.com',
      'user',
    );

    const serialized = serializeDomainEvent(original);
    const rehydrated = rehydrateDomainEvent(serialized);

    expect(serialized.type).toBe(OUTBOX_EVENT_TYPES.USER_REGISTERED);
    expect(rehydrated).toBeInstanceOf(UserRegisteredEvent);
    expect(rehydrated.eventId).toBe(original.eventId);
    expect(rehydrated.occurredOn).toEqual(original.occurredOn);
    expect(rehydrated).toEqual(
      expect.objectContaining({
        userId: 'user-id',
        email: 'user@example.com',
        username: 'user',
      }),
    );
  });

  it('rejects unknown event types instead of silently dropping them', () => {
    expect(() =>
      rehydrateDomainEvent({
        id: 'event-id',
        type: 'unknown.event.v1',
        payload: {},
        occurredAt: new Date(),
      }),
    ).toThrow('Unsupported outbox event type');
  });
});
