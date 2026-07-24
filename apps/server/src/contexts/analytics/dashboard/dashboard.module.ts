import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaModule } from '@infrastructure/database/prisma.module';
import { RedisModule } from '@infrastructure/cache/redis.module';
import { DashboardController } from './presentation/controllers/dashboard.controller';
import { GetDashboardStatsQueryHandler } from './application/queries/handlers/get-dashboard-stats.handler';

@Module({
    imports: [
        CqrsModule,
        PrismaModule,
        RedisModule,
    ],
    controllers: [DashboardController],
    providers: [GetDashboardStatsQueryHandler],
    exports: [GetDashboardStatsQueryHandler],
})
export class DashboardModule {}
