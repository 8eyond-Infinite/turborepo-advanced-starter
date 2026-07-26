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

  it('backs off and stops spamming logs while the database is unreachable', async () => {
    const prisma = {
      outboxEvent: {
        updateMany: jest.fn().mockRejectedValue(new Error('ECONNREFUSED')),
        findMany: jest.fn(),
        update: jest.fn(),
      },
    } as unknown as jest.Mocked<PrismaService>;
    const router = {
      dispatch: jest.fn(),
    } as unknown as jest.Mocked<OutboxEventRouter>;
    const service = new OutboxPublisherService(
      prisma,
      router,
      new ConfigService(),
    );
    const errorSpy = jest
      .spyOn(service['logger'], 'error')
      .mockImplementation(() => undefined);

    await service.poll();
    // Các nhịp quét ngay sau đó rơi vào cửa sổ chờ: không chạm database,
    // không ghi thêm log.
    await service.poll();
    await service.poll();

    expect(prisma.outboxEvent.updateMany).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });

  it('deletes only published events older than the retention window', async () => {
    const deleteMany = jest.fn().mockResolvedValue({ count: 7 });
    const prisma = {
      outboxEvent: { deleteMany },
    } as unknown as jest.Mocked<PrismaService>;
    const service = new OutboxPublisherService(
      prisma,
      {} as unknown as jest.Mocked<OutboxEventRouter>,
      new ConfigService(),
    );

    const removed = await service.cleanupPublished(30);

    expect(removed).toBe(7);
    const where = deleteMany.mock.calls[0][0].where;
    expect(where.status).toBe('PUBLISHED');
    expect(where.processedAt.lt).toBeInstanceOf(Date);
  });
});
