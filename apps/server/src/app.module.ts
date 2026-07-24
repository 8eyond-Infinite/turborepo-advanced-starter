import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from '@infrastructure/database/prisma.module';
import { RedisModule } from '@infrastructure/cache/redis.module';
import { QueueModule } from '@infrastructure/queue/queue.module';
import { EventDispatcherModule } from '@infrastructure/event-bus/event-dispatcher.module';
import { IamModule } from './contexts/iam/iam.module';
import { AnalyticsModule } from './contexts/analytics/analytics.module';
import { StorageModule } from './contexts/storage/storage.module';
import { MenuModule } from './contexts/menu/menu.module';
import { RealtimeModule } from '@infrastructure/realtime/realtime.module';
import { NotificationModule } from './contexts/notifications/notification.module';
import { AuditLogModule } from './contexts/audit/audit-log.module';

import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditLogInterceptor } from '@presentation/interceptors/audit-log.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    RedisModule,
    QueueModule,
    EventDispatcherModule,
    IamModule,
    AnalyticsModule,
    StorageModule,
    MenuModule,
    RealtimeModule,
    NotificationModule,
    AuditLogModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditLogInterceptor,
    },
  ],
})
export class AppModule { }
