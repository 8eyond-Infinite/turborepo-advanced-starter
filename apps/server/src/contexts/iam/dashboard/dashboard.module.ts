import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaModule } from '@shared/infrastructure/prisma/prisma.module';
import { RedisModule } from '@shared/infrastructure/cache/redis.module';
import { UsersModule } from '../users/users.module';
import { DashboardController } from './presentation/controllers/dashboard.controller';
import { GetDashboardStatsQueryHandler } from './application/queries/handlers/get-dashboard-stats.handler';

@Module({
    imports: [
        CqrsModule,
        PrismaModule,
        RedisModule,
        UsersModule,
    ],
    controllers: [DashboardController],
    providers: [GetDashboardStatsQueryHandler],
})
export class DashboardModule {}
