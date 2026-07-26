import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
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

import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AuditLogInterceptor } from '@presentation/interceptors/audit-log.interceptor';
import { RequestContextInterceptor } from '@presentation/interceptors/request-context.interceptor';
import { validateEnvironment } from './config/environment';
import { HealthModule } from '@infrastructure/health/health.module';
import { MetricsModule } from '@infrastructure/metrics/metrics.module';
import { HttpMetricsInterceptor } from '@infrastructure/metrics/http-metrics.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      cache: true,
      validate: validateEnvironment,
    }),
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 100 }],
      // Rate limits protect real traffic; E2E drives auth endpoints hard on purpose.
      skipIf: () => process.env.NODE_ENV === 'test',
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        level:
          process.env.LOG_LEVEL ??
          (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
        // RequestContextInterceptor emits the single request-completed line;
        // pino-http's own access log would duplicate it.
        autoLogging: false,
        redact: {
          paths: ['req.headers.authorization', 'req.headers.cookie'],
        },
        transport:
          process.env.NODE_ENV === 'development'
            ? {
                target: 'pino-pretty',
                options: { singleLine: true, translateTime: 'SYS:HH:MM:ss' },
              }
            : undefined,
      },
    }),
    MetricsModule,
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
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpMetricsInterceptor,
    },
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
