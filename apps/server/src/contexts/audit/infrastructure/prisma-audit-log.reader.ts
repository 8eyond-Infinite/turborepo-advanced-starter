import { Injectable } from '@nestjs/common';
import type { Prisma } from '@repo/database';
import { PrismaService } from '@infrastructure/database/prisma.service';
import type {
  AuditLogReader,
  AuditLogRecord,
} from '../application/ports/audit-log-reader.port';

@Injectable()
export class PrismaAuditLogReader implements AuditLogReader {
  constructor(private readonly prisma: PrismaService) {}

  async findPage(input: {
    page: number;
    limit: number;
    search?: string;
  }): Promise<{ logs: AuditLogRecord[]; total: number }> {
    const where: Prisma.AuditLogWhereInput = input.search
      ? {
          OR: [
            { action: { contains: input.search, mode: 'insensitive' } },
            { details: { contains: input.search, mode: 'insensitive' } },
            { userEmail: { contains: input.search, mode: 'insensitive' } },
            { correlationId: { contains: input.search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip: (input.page - 1) * input.limit,
        take: input.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { logs, total };
  }
}
