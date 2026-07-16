import { Module } from '@nestjs/common';
import { PrismaModule } from '@shared/infrastructure/prisma/prisma.module';
import { RedisModule } from '@shared/infrastructure/cache/redis.module';
import { UsersModule } from '../users/users.module';
import { DashboardController } from './presentation/controllers/dashboard.controller';

@Module({
    imports: [PrismaModule, RedisModule, UsersModule],
    controllers: [DashboardController],
})
export class DashboardModule {}
