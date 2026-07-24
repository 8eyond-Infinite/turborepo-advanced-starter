import { Controller, Get, Query, UseGuards, HttpStatus, HttpCode } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { QueryBus } from '@nestjs/cqrs';
import { PERMISSIONS } from '@repo/contracts';

import { JwtAuthGuard, PermissionsGuard } from '@presentation/guards';
import { RequirePermissions } from '@presentation/decorators';
import { PaginationQueryDto } from '@presentation/dto/pagination-query.dto';
import { PaginatedResponsePresenter } from '@presentation/presenters/pagination.presenter';

import { GetAuditLogsQuery } from '../../application/queries';

@ApiTags('Audit Logs')
@ApiBearerAuth()
@Controller('audit-logs')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AuditLogController {
    constructor(
        private readonly queryBus: QueryBus,
    ) {}

    @Get()
    @RequirePermissions(PERMISSIONS.AUDIT.READ)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get paginated audit logs for administrators' })
    @ApiResponse({ status: 200, description: 'Return paginated list of audit logs' })
    async getAuditLogs(@Query() query: PaginationQueryDto) {
        const result = await this.queryBus.execute(new GetAuditLogsQuery(query));
        const { logs, total } = result.unwrap();

        const page = query.page || 1;
        const limit = query.limit || 10;

        return PaginatedResponsePresenter.toResponse(logs, total, page, limit);
    }
}
