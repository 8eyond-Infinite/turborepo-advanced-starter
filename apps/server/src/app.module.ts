import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from '@shared/infrastructure/prisma/prisma.module';
import { RedisModule } from '@shared/infrastructure/cache/redis.module';
import { QueueModule } from '@shared/infrastructure/queue/queue.module';
import { IamModule } from './contexts/iam/iam.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    RedisModule,
    QueueModule,
    IamModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
