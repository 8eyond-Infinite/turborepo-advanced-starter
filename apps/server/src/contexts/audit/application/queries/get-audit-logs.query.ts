import type { PaginationQueryDto } from '@presentation/common/dto/pagination-query.dto';
import { IQuery } from '@nestjs/cqrs';

export class GetAuditLogsQuery implements IQuery {
    constructor(
        public readonly paginationQuery: PaginationQueryDto,
    ) {}
}
