import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from '@infrastructure/database/prisma.module';
import { RedisModule } from '@infrastructure/cache/redis.module';
import { QueueModule } from '@infrastructure/queue/queue.module';
import { OutboxModule } from '@infrastructure/event-bus/outbox.module';
import { IamModule } from './contexts/iam/iam.module';
import { AnalyticsModule } from './contexts/analytics/analytics.module';
import { StorageModule } from './contexts/storage/storage.module';
import { MenuModule } from './contexts/menu/menu.module';
import { RealtimeModule } from '@infrastructure/realtime/realtime.module';
import { NotificationModule } from './contexts/notifications/notification.module';
import { AuditLogModule } from './contexts/audit/audit-log.module';

import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditLogInterceptor } from '@presentation/interceptors/audit-log.interceptor';
import { RequestContextInterceptor } from '@presentation/interceptors/request-context.interceptor';
import { validateEnvironment } from './config/environment';
import { HealthModule } from '@infrastructure/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      cache: true,
      validate: validateEnvironment,
    }),
    PrismaModule,
    RedisModule,
    QueueModule,
    OutboxModule,
    IamModule,
    AnalyticsModule,
    StorageModule,
    MenuModule,
    RealtimeModule,
    NotificationModule,
    AuditLogModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestContextInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditLogInterceptor,
    },
  ],
})
export class AppModule {}
