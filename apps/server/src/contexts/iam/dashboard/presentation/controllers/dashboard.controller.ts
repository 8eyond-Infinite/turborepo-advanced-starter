import { Controller, Get, UseGuards, HttpStatus, HttpCode } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { QueryBus } from '@nestjs/cqrs';
import { JwtAuthGuard } from '../../../auth/application/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../auth/application/guards/permissions.guard';
import { RequirePermissions } from '../../../auth/application/decorators/permissions.decorator';
import { GetDashboardStatsQuery } from '../../application/queries/get-dashboard-stats.query';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DashboardController {
    constructor(
        private readonly queryBus: QueryBus,
    ) {}

    @Get('stats')
    @RequirePermissions('user:read')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get dashboard statistics for system overview' })
    @ApiResponse({ status: 200, description: 'Return statistics dashboard object' })
    async getStats() {
        const result = await this.queryBus.execute(new GetDashboardStatsQuery());
        return result.unwrap();
    }
}
