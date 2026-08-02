import type { PrismaService } from '@infrastructure/database/prisma.service';
import { PrismaAuditLogReader } from './prisma-audit-log.reader';

describe('PrismaAuditLogReader', () => {
  it('searches correlation id together with human-readable audit fields', async () => {
    const prisma = {
      auditLog: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    } as unknown as PrismaService;
    const reader = new PrismaAuditLogReader(prisma);

    await reader.findPage({
      page: 1,
      limit: 10,
      search: 'correlation-123',
    });

    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: expect.arrayContaining([
            {
              correlationId: {
                contains: 'correlation-123',
                mode: 'insensitive',
              },
            },
          ]),
        },
      }),
    );
  });
});
