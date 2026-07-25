import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { OUTBOX_EVENT_TYPES } from './outbox-event.mapper';
import { OutboxPublisherService } from './outbox-publisher.service';
import { OutboxEventRouter } from './outbox-event.router';

describe('OutboxPublisherService', () => {
  const candidate = {
    id: 'event-id',
    type: OUTBOX_EVENT_TYPES.USER_REGISTERED,
    aggregateId: 'user-id',
    payload: {
      userId: 'user-id',
      email: 'user@example.com',
      username: 'user',
    },
    occurredAt: new Date(),
    status: 'PENDING',
    attempts: 0,
    availableAt: new Date(),
    lockedAt: null,
    processedAt: null,
    lastError: null,
    createdAt: new Date(),
  };

  const createPrismaMock = () =>
    ({
      outboxEvent: {
        findMany: jest.fn().mockResolvedValue([candidate]),
        updateMany: jest
          .fn()
          .mockResolvedValueOnce({ count: 0 })
          .mockResolvedValueOnce({ count: 1 }),
        update: jest.fn().mockResolvedValue(candidate),
      },
    }) as unknown as jest.Mocked<PrismaService>;

  it('claims, publishes and marks an event as published', async () => {
    const prisma = createPrismaMock();
    const router = {
      dispatch: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<OutboxEventRouter>;
    const service = new OutboxPublisherService(
      prisma,
      router,
      new ConfigService(),
    );

    await service.poll();

    expect(router.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ eventId: 'event-id' }),
    );
    expect(prisma.outboxEvent.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'event-id' },
        data: expect.objectContaining({ status: 'PUBLISHED' }),
      }),
    );
  });

  it('reschedules a failed publication with an error message', async () => {
    const prisma = createPrismaMock();
    const router = {
      dispatch: jest.fn().mockRejectedValue(new Error('delivery unavailable')),
    } as unknown as jest.Mocked<OutboxEventRouter>;
    const service = new OutboxPublisherService(
      prisma,
      router,
      new ConfigService(),
    );

    await service.poll();

    expect(prisma.outboxEvent.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'event-id' },
        data: expect.objectContaining({
          status: 'PENDING',
          lastError: 'delivery unavailable',
        }),
      }),
    );
  });
});
