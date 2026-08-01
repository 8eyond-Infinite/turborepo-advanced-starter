import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { AuditRetentionService } from './audit-retention.service';

describe('AuditRetentionService', () => {
  it('does not schedule deletion when retention is disabled', async () => {
    const deleteMany = jest.fn();
    const service = new AuditRetentionService(
      {
        auditLog: { findMany: jest.fn(), deleteMany },
      } as unknown as PrismaService,
      new ConfigService({ AUDIT_RETENTION_DAYS: 0 }),
    );

    service.onApplicationBootstrap();
    await service.onApplicationShutdown();

    expect(deleteMany).not.toHaveBeenCalled();
  });

  it('deletes only records older than the configured cutoff', async () => {
    const now = new Date('2026-08-01T00:00:00.000Z');
    jest.useFakeTimers().setSystemTime(now);
    const findMany = jest
      .fn()
      .mockResolvedValue([{ id: 'audit-1' }, { id: 'audit-2' }]);
    const deleteMany = jest.fn().mockResolvedValue({ count: 2 });
    const service = new AuditRetentionService(
      { auditLog: { findMany, deleteMany } } as unknown as PrismaService,
      new ConfigService(),
    );

    try {
      await expect(service.cleanupExpired(90)).resolves.toBe(2);
      expect(findMany).toHaveBeenCalledWith({
        where: {
          createdAt: { lt: new Date('2026-05-03T00:00:00.000Z') },
        },
        orderBy: { createdAt: 'asc' },
        take: 1_000,
        select: { id: true },
      });
      expect(deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ['audit-1', 'audit-2'] } },
      });
    } finally {
      jest.useRealTimers();
    }
  });

  it('keeps the application alive when cleanup fails', async () => {
    const service = new AuditRetentionService(
      {
        auditLog: {
          findMany: jest.fn().mockRejectedValue(new Error('database down')),
          deleteMany: jest.fn().mockRejectedValue(new Error('database down')),
        },
      } as unknown as PrismaService,
      new ConfigService(),
    );
    jest.spyOn(service['logger'], 'error').mockImplementation(() => undefined);

    await expect(service.cleanupExpired(30)).resolves.toBe(0);
  });

  it('deletes a large backlog in bounded batches', async () => {
    const firstBatch = Array.from({ length: 1_000 }, (_, index) => ({
      id: `audit-${index}`,
    }));
    const findMany = jest
      .fn()
      .mockResolvedValueOnce(firstBatch)
      .mockResolvedValueOnce([{ id: 'audit-final' }]);
    const deleteMany = jest
      .fn()
      .mockResolvedValueOnce({ count: 1_000 })
      .mockResolvedValueOnce({ count: 1 });
    const service = new AuditRetentionService(
      { auditLog: { findMany, deleteMany } } as unknown as PrismaService,
      new ConfigService(),
    );

    await expect(service.cleanupExpired(30)).resolves.toBe(1_001);
    expect(findMany).toHaveBeenCalledTimes(2);
    expect(deleteMany).toHaveBeenCalledTimes(2);
  });

  it('refuses a non-positive retention window before touching data', async () => {
    const deleteMany = jest.fn();
    const service = new AuditRetentionService(
      {
        auditLog: { findMany: jest.fn(), deleteMany },
      } as unknown as PrismaService,
      new ConfigService(),
    );
    jest.spyOn(service['logger'], 'warn').mockImplementation(() => undefined);

    await expect(service.cleanupExpired(0)).resolves.toBe(0);
    expect(deleteMany).not.toHaveBeenCalled();
  });
});
