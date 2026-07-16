import { Controller, Get, Query, UseGuards, HttpStatus, HttpCode } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/application/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../auth/application/guards/permissions.guard';
import { RequirePermissions } from '../../../auth/application/decorators/permissions.decorator';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { PaginationQueryDto } from '@shared/infrastructure/dto/pagination-query.dto';
import { PaginatedResponsePresenter } from '@shared/infrastructure/presenters/pagination.presenter';

@ApiTags('Audit Logs')
@ApiBearerAuth()
@Controller('audit-logs')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AuditLogController {
    constructor(private readonly prisma: PrismaService) {}

    @Get()
    @RequirePermissions('user:read')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get paginated audit logs for administrators' })
    @ApiResponse({ status: 200, description: 'Return paginated list of audit logs' })
    async getAuditLogs(@Query() query: PaginationQueryDto) {
        const page = query.page || 1;
        const limit = query.limit || 10;
        const skip = (page - 1) * limit;

        const where: any = {};
        if (query.search) {
            where.OR = [
                { action: { contains: query.search, mode: 'insensitive' } },
                { details: { contains: query.search, mode: 'insensitive' } },
                { userEmail: { contains: query.search, mode: 'insensitive' } },
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

        return PaginatedResponsePresenter.toResponse(logs, total, page, limit);
    }
}
