import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetAuditLogsQuery } from '../get-audit-logs.query';
import { Result } from '@shared/domain/result';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';

export class GetAuditLogsException extends DomainException {
    constructor(message: string) {
        super(message);
    }
}

@QueryHandler(GetAuditLogsQuery)
export class GetAuditLogsQueryHandler implements IQueryHandler<GetAuditLogsQuery, Result<{ logs: any[]; total: number }, DomainException>> {
    constructor(
        private readonly prisma: PrismaService,
    ) {}

    async execute(query: GetAuditLogsQuery): Promise<Result<{ logs: any[]; total: number }, DomainException>> {
        try {
            const { page = 1, limit = 10, search } = query.paginationQuery;
            const skip = (page - 1) * limit;

            const where: any = {};
            if (search) {
                where.OR = [
                    { action: { contains: search, mode: 'insensitive' } },
                    { details: { contains: search, mode: 'insensitive' } },
                    { userEmail: { contains: search, mode: 'insensitive' } },
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
        } catch (error: any) {
            return Result.fail(new GetAuditLogsException(error.message || 'Failed to retrieve audit logs'));
        }
    }
}
