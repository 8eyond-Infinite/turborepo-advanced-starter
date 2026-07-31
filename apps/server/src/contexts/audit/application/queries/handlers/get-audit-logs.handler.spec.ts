import type { PrismaService } from '@infrastructure/database/prisma.service';
import { GetAuditLogsQuery } from '../get-audit-logs.query';
import { GetAuditLogsQueryHandler } from './get-audit-logs.handler';

describe('GetAuditLogsQueryHandler', () => {
  it('searches correlation id together with the human-readable audit fields', async () => {
    const prisma = {
      auditLog: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    } as unknown as PrismaService;
    const handler = new GetAuditLogsQueryHandler(prisma);

    await handler.execute(
      new GetAuditLogsQuery({
        page: 1,
        limit: 10,
        search: 'correlation-123',
      }),
    );

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
