import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetDashboardStatsQuery } from '../get-dashboard-stats.query';
import { Result } from '@shared/domain/result';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { RedisService } from '@shared/infrastructure/cache/redis.service';

export class GetDashboardStatsException extends DomainException {
    constructor(message: string) {
        super(message);
    }
}

@QueryHandler(GetDashboardStatsQuery)
export class GetDashboardStatsQueryHandler implements IQueryHandler<GetDashboardStatsQuery, Result<any, DomainException>> {
    constructor(
        private readonly prisma: PrismaService,
        private readonly redis: RedisService,
    ) {}

    async execute(query: GetDashboardStatsQuery): Promise<Result<any, DomainException>> {
        try {
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

            return Result.ok({
                totalUsers,
                activeUsers,
                inactiveUsers,
                activeSessionsCount,
                rolesDistribution,
                userRegistrationTrend,
            });
        } catch (error: any) {
            return Result.fail(new GetDashboardStatsException(error.message || 'Failed to aggregate dashboard statistics'));
        }
    }
}
