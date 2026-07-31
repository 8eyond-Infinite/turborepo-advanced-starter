import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { validateEnvironment } from './config/environment';
import { buildBullConnection } from '@infrastructure/queue/bull-connection';
import { USER_QUEUE } from '@iam/users/application/queues/user-queue.constants';
import { UserQueueProcessor } from '@iam/users/application/queues/user-queue.processor';
import { LoggerModule } from 'nestjs-pino';
import { createPinoHttpOptions } from '@infrastructure/observability/logger.config';

// Composition root của worker process: chỉ lắp những gì consumer cần
// (config + kết nối queue + processor). Không HTTP, không Prisma,
// không Socket.IO — job nặng chạy ở đây không tranh event loop với API.
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      cache: true,
      validate: validateEnvironment,
    }),
    LoggerModule.forRoot({ pinoHttp: createPinoHttpOptions() }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: buildBullConnection,
    }),
    BullModule.registerQueue({ name: USER_QUEUE }),
  ],
  providers: [UserQueueProcessor],
})
export class WorkerModule {}
