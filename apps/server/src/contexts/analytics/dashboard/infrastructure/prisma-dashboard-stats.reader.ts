import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import type {
  DashboardDatabaseStats,
  DashboardStatsReader,
} from '../application/ports/dashboard-stats-reader.port';

@Injectable()
export class PrismaDashboardStatsReader implements DashboardStatsReader {
  constructor(private readonly prisma: PrismaService) {}

  async read(): Promise<DashboardDatabaseStats> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const [totalUsers, activeUsers, roles, usersCreated] = await Promise.all([
      this.prisma.user.count({ where: { isDeleted: false } }),
      this.prisma.user.count({
        where: { isDeleted: false, isActive: true },
      }),
      this.prisma.role.findMany({
        where: { isDeleted: false },
        include: { _count: { select: { userRoles: true } } },
      }),
      this.prisma.user.findMany({
        where: {
          isDeleted: false,
          createdAt: { gte: sevenDaysAgo },
        },
        select: { createdAt: true },
      }),
    ]);

    const trendMap: Record<string, number> = {};
    for (let offset = 0; offset < 7; offset++) {
      const date = new Date();
      date.setDate(date.getDate() - offset);
      trendMap[date.toISOString().split('T')[0]] = 0;
    }

    for (const user of usersCreated) {
      const date = user.createdAt.toISOString().split('T')[0];
      if (trendMap[date] !== undefined) trendMap[date] += 1;
    }

    return {
      totalUsers,
      activeUsers,
      rolesDistribution: roles.map((role) => ({
        role: role.name,
        count: role._count.userRoles,
      })),
      userRegistrationTrend: Object.keys(trendMap)
        .sort()
        .map((date) => ({ date, count: trendMap[date] })),
    };
  }
}
