import { Controller, Get, UseGuards, HttpStatus, HttpCode } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/application/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../auth/application/guards/permissions.guard';
import { RequirePermissions } from '../../../auth/application/decorators/permissions.decorator';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { RedisService } from '@shared/infrastructure/cache/redis.service';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DashboardController {
    constructor(
        private readonly prisma: PrismaService,
        private readonly redis: RedisService,
    ) {}

    @Get('stats')
    @RequirePermissions('user:read')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get dashboard statistics for system overview' })
    @ApiResponse({ status: 200, description: 'Return statistics dashboard object' })
    async getStats() {
        // 1. Fetch User status metrics
        const totalUsers = await this.prisma.user.count({ where: { isDeleted: false } });
        const activeUsers = await this.prisma.user.count({ where: { isDeleted: false, isActive: true } });
        const inactiveUsers = totalUsers - activeUsers;

        // 2. Fetch Active sessions from Redis
        const sessionKeys = await this.redis.keys('refresh_token:*');
        const activeSessionsCount = sessionKeys.length;

        // 3. Fetch Role distribution
        const roles = await this.prisma.role.findMany({
            where: { isDeleted: false },
            include: {
                _count: {
                    select: { userRoles: true }
                }
            }
        });
        const rolesDistribution = roles.map(r => ({
            role: r.name,
            count: r._count.userRoles,
        }));

        // 4. Fetch Registration Trend for last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        const usersCreated = await this.prisma.user.findMany({
            where: {
                isDeleted: false,
                createdAt: {
                    gte: sevenDaysAgo,
                },
            },
            select: {
                createdAt: true,
            },
        });

        // Initialize last 7 days map
        const trendMap: Record<string, number> = {};
        for (let i = 0; i < 7; i++) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            trendMap[dateStr] = 0;
        }

        // Aggregate user count by date
        usersCreated.forEach(u => {
            const dateStr = u.createdAt.toISOString().split('T')[0];
            if (trendMap[dateStr] !== undefined) {
                trendMap[dateStr]++;
            }
        });

        const userRegistrationTrend = Object.keys(trendMap)
            .sort()
            .map(date => ({
                date,
                count: trendMap[date],
            }));

        return {
            totalUsers,
            activeUsers,
            inactiveUsers,
            activeSessionsCount,
            rolesDistribution,
            userRegistrationTrend,
        };
    }
}
