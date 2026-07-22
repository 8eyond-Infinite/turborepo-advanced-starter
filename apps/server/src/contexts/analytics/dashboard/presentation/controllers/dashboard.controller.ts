import { Controller, Get, UseGuards, HttpStatus, HttpCode } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { QueryBus } from '@nestjs/cqrs';
import { PERMISSIONS } from '@repo/contracts';

import { JwtAuthGuard, PermissionsGuard } from '@shared/infrastructure/guards';
import { RequirePermissions } from '@shared/infrastructure/decorators';

import { GetDashboardStatsQuery } from '../../application/queries';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DashboardController {
    constructor(
        private readonly queryBus: QueryBus,
    ) {}

    @Get('stats')
    @RequirePermissions(PERMISSIONS.USER.READ)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get dashboard statistics for system overview' })
    @ApiResponse({ status: 200, description: 'Return statistics dashboard object' })
    async getStats() {
        const result = await this.queryBus.execute(new GetDashboardStatsQuery());
        return result.unwrap();
    }
}
