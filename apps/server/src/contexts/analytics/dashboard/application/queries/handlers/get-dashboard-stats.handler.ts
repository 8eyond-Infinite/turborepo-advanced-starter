import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { GetDashboardStatsQuery } from '../get-dashboard-stats.query';
import { Result } from '@shared/domain/result';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { CACHE_PORT } from '@shared/application/ports/cache.port';
import type { ICachePort } from '@shared/application/ports/cache.port';
import {
  DASHBOARD_STATS_READER,
  type DashboardStatsReader,
} from '../../ports/dashboard-stats-reader.port';

import { Errors } from '@repo/contracts';

export class GetDashboardStatsException extends DomainException {
  constructor(message: string) {
    super(message, Errors.INTERNAL_SERVER_ERROR);
  }
}

export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  activeSessionsCount: number;
  rolesDistribution: Array<{ role: string; count: number }>;
  userRegistrationTrend: Array<{ date: string; count: number }>;
}

@QueryHandler(GetDashboardStatsQuery)
export class GetDashboardStatsQueryHandler implements IQueryHandler<
  GetDashboardStatsQuery,
  Result<DashboardStats, DomainException>
> {
  constructor(
    @Inject(DASHBOARD_STATS_READER)
    private readonly statsReader: DashboardStatsReader,
    @Inject(CACHE_PORT)
    private readonly cache: ICachePort,
  ) {}

  async execute(): Promise<Result<DashboardStats, DomainException>> {
    try {
      const databaseStats = await this.statsReader.read();
      const { totalUsers, activeUsers } = databaseStats;
      const inactiveUsers = totalUsers - activeUsers;

      // 2. Fetch Active sessions from Redis
      const sessionKeys = await this.cache.scan('refresh_token:*');
      const activeSessionsCount = sessionKeys.length;

      return Result.ok({
        totalUsers,
        activeUsers,
        inactiveUsers,
        activeSessionsCount,
        rolesDistribution: databaseStats.rolesDistribution,
        userRegistrationTrend: databaseStats.userRegistrationTrend,
      });
    } catch (error: unknown) {
      return Result.fail(
        new GetDashboardStatsException(
          error instanceof Error
            ? error.message
            : 'Failed to aggregate dashboard statistics',
        ),
      );
    }
  }
}
