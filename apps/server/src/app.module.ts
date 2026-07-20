import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from '@shared/infrastructure/prisma/prisma.module';
import { RedisModule } from '@shared/infrastructure/cache/redis.module';
import { QueueModule } from '@shared/infrastructure/queue/queue.module';
import { EventDispatcherModule } from '@shared/infrastructure/event/event-dispatcher.module';
import { IamModule } from './contexts/iam/iam.module';
import { StorageModule } from './contexts/storage/storage.module';
import { MenuModule } from './contexts/menu/menu.module';
import { RealtimeModule } from '@shared/infrastructure/realtime/realtime.module';

import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditLogInterceptor } from '@shared/infrastructure/interceptors/audit-log.interceptor';

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
    StorageModule,
    MenuModule,
    RealtimeModule,
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
