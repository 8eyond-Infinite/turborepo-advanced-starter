import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetAuditLogsQuery } from '../get-audit-logs.query';
import { Result } from '@shared/domain/result';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { PrismaService } from '@infrastructure/database/prisma.service';

import { Errors } from '@repo/contracts';
import type { AuditLog, Prisma } from '@repo/database';

export interface AuditLogPage {
  logs: AuditLog[];
  total: number;
}

export class GetAuditLogsException extends DomainException {
  constructor(message: string) {
    super(message, Errors.INTERNAL_SERVER_ERROR);
  }
}

@QueryHandler(GetAuditLogsQuery)
export class GetAuditLogsQueryHandler implements IQueryHandler<
  GetAuditLogsQuery,
  Result<AuditLogPage, DomainException>
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    query: GetAuditLogsQuery,
  ): Promise<Result<AuditLogPage, DomainException>> {
    try {
      const { page = 1, limit = 10, search } = query.paginationQuery;
      const skip = (page - 1) * limit;

      const where: Prisma.AuditLogWhereInput = {};
      if (search) {
        where.OR = [
          { action: { contains: search, mode: 'insensitive' } },
          { details: { contains: search, mode: 'insensitive' } },
          { userEmail: { contains: search, mode: 'insensitive' } },
          { correlationId: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [logs, total] = await Promise.all([
        this.prisma.auditLog.findMany({
          where,
          skip,
          take: limit,
          orderBy: {
            createdAt: 'desc',
          },
        }),
        this.prisma.auditLog.count({ where }),
      ]);

      return Result.ok({ logs, total });
    } catch (error: unknown) {
      return Result.fail(
        new GetAuditLogsException(
          error instanceof Error
            ? error.message
            : 'Failed to retrieve audit logs',
        ),
      );
    }
  }
}
