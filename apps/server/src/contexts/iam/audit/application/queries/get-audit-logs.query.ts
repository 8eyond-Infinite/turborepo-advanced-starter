import type { PaginationQueryDto } from '@shared/infrastructure/dto/pagination-query.dto';

export class GetAuditLogsQuery {
    constructor(
        public readonly paginationQuery: PaginationQueryDto,
    ) {}
}
