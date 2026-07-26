import { UserDeactivatedEvent } from '@iam/users/domain/events/user-deactivated.event';
import { UserRegisteredEvent } from '@iam/users/domain/events/user-registered.event';
import { NotificationCreatedEvent } from '@/contexts/notifications/domain/events/notification-created.event';
import { DomainEvent } from '@shared/domain/events/domain-event';
import type { Prisma } from '@repo/database';
import { getCorrelationId } from '@infrastructure/observability/correlation-context';

export const OUTBOX_EVENT_TYPES = {
  USER_REGISTERED: 'iam.user.registered.v1',
  USER_DEACTIVATED: 'iam.user.deactivated.v1',
  NOTIFICATION_CREATED: 'notifications.notification.created.v1',
} as const;

export interface SerializedOutboxEvent {
  id: string;
  type: string;
  aggregateId: string;
  payload: Prisma.InputJsonObject;
  occurredAt: Date;
  correlationId: string | null;
}

export interface PersistedOutboxEvent {
  id: string;
  type: string;
  payload: unknown;
  occurredAt: Date;
}

const asPayload = (payload: unknown): Record<string, unknown> => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Outbox event payload must be an object');
  }
  return payload as Record<string, unknown>;
};

const requireString = (
  payload: Record<string, unknown>,
  key: string,
): string => {
  const value = payload[key];
  if (typeof value !== 'string') {
    throw new Error(`Outbox payload property "${key}" must be a string`);
  }
  return value;
};

// Gắn correlation ID của request đang chạy vào row outbox, để sau này lần
// ngược được từ email/notification về đúng request đã sinh ra nó.
export const serializeDomainEvent = (
  event: DomainEvent,
): SerializedOutboxEvent => ({
  ...serializeEventPayload(event),
  correlationId: getCorrelationId() ?? null,
});

const serializeEventPayload = (
  event: DomainEvent,
): Omit<SerializedOutboxEvent, 'correlationId'> => {
  if (event instanceof UserRegisteredEvent) {
    return {
      id: event.eventId,
      type: OUTBOX_EVENT_TYPES.USER_REGISTERED,
      aggregateId: event.userId,
      payload: {
        userId: event.userId,
        email: event.email,
        username: event.username,
      },
      occurredAt: event.occurredOn,
    };
  }

  if (event instanceof UserDeactivatedEvent) {
    return {
      id: event.eventId,
      type: OUTBOX_EVENT_TYPES.USER_DEACTIVATED,
      aggregateId: event.userId,
      payload: {
        userId: event.userId,
        email: event.email,
      },
      occurredAt: event.occurredOn,
    };
  }

  if (event instanceof NotificationCreatedEvent) {
    return {
      id: event.eventId,
      type: OUTBOX_EVENT_TYPES.NOTIFICATION_CREATED,
      aggregateId: event.id,
      payload: {
        id: event.id,
        userId: event.userId,
        title: event.title,
        content: event.content,
        type: event.type,
        isRead: event.isRead,
        createdAt: event.createdAt.toISOString(),
      },
      occurredAt: event.occurredOn,
    };
  }

  throw new Error(`Unsupported domain event: ${event.constructor.name}`);
};

export const rehydrateDomainEvent = (
  persisted: PersistedOutboxEvent,
): DomainEvent => {
  const payload = asPayload(persisted.payload);
  let event: DomainEvent;

  switch (persisted.type) {
    case OUTBOX_EVENT_TYPES.USER_REGISTERED:
      event = new UserRegisteredEvent(
        requireString(payload, 'userId'),
        requireString(payload, 'email'),
        requireString(payload, 'username'),
      );
      break;
    case OUTBOX_EVENT_TYPES.USER_DEACTIVATED:
      event = new UserDeactivatedEvent(
        requireString(payload, 'userId'),
        requireString(payload, 'email'),
      );
      break;
    case OUTBOX_EVENT_TYPES.NOTIFICATION_CREATED:
      event = new NotificationCreatedEvent(
        requireString(payload, 'id'),
        requireString(payload, 'userId'),
        requireString(payload, 'title'),
        requireString(payload, 'content'),
        requireString(payload, 'type'),
        payload.isRead === true,
        new Date(requireString(payload, 'createdAt')),
      );
      break;
    default:
      throw new Error(`Unsupported outbox event type: ${persisted.type}`);
  }

  Object.defineProperties(event, {
    eventId: { value: persisted.id },
    occurredOn: { value: persisted.occurredAt },
  });
  return event;
};
