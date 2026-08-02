import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaModule } from '@infrastructure/database/prisma.module';
import { RedisModule } from '@infrastructure/cache/redis.module';
import { DashboardController } from './presentation/controllers/dashboard.controller';
import { GetDashboardStatsQueryHandler } from './application/queries/handlers/get-dashboard-stats.handler';
import { DASHBOARD_STATS_READER } from './application/ports/dashboard-stats-reader.port';
import { PrismaDashboardStatsReader } from './infrastructure/prisma-dashboard-stats.reader';

@Module({
  imports: [CqrsModule, PrismaModule, RedisModule],
  controllers: [DashboardController],
  providers: [
    GetDashboardStatsQueryHandler,
    { provide: DASHBOARD_STATS_READER, useClass: PrismaDashboardStatsReader },
  ],
  exports: [GetDashboardStatsQueryHandler],
})
export class DashboardModule {}
