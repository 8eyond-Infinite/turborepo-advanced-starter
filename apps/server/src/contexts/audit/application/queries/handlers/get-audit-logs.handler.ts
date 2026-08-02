import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetAuditLogsQuery } from '../get-audit-logs.query';
import { Result } from '@shared/domain/result';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Inject } from '@nestjs/common';
import {
  AUDIT_LOG_READER,
  type AuditLogReader,
  type AuditLogRecord,
} from '../../ports/audit-log-reader.port';

import { Errors } from '@repo/contracts';
export interface AuditLogPage {
  logs: AuditLogRecord[];
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
  constructor(
    @Inject(AUDIT_LOG_READER) private readonly auditLogReader: AuditLogReader,
  ) {}

  async execute(
    query: GetAuditLogsQuery,
  ): Promise<Result<AuditLogPage, DomainException>> {
    try {
      const { page = 1, limit = 10, search } = query.pagination;
      return Result.ok(
        await this.auditLogReader.findPage({ page, limit, search }),
      );
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
