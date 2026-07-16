import { Controller, Get, Query, UseGuards, HttpStatus, HttpCode } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { QueryBus } from '@nestjs/cqrs';
import { JwtAuthGuard } from '../../../auth/application/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../auth/application/guards/permissions.guard';
import { RequirePermissions } from '../../../auth/application/decorators/permissions.decorator';
import { PaginationQueryDto } from '@shared/infrastructure/dto/pagination-query.dto';
import { PaginatedResponsePresenter } from '@shared/infrastructure/presenters/pagination.presenter';
import { GetAuditLogsQuery } from '../../application/queries/get-audit-logs.query';

@ApiTags('Audit Logs')
@ApiBearerAuth()
@Controller('audit-logs')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AuditLogController {
    constructor(
        private readonly queryBus: QueryBus,
    ) {}

    @Get()
    @RequirePermissions('user:read')
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
