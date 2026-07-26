import { Module, Global } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullmqQueueAdapter } from './bullmq-queue.adapter';
import { buildBullConnection } from './bull-connection';
import { JOB_QUEUE_PORT } from '@shared/application/ports/job-queue.port';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: buildBullConnection,
    }),
  ],
  providers: [
    BullmqQueueAdapter,
    {
      provide: JOB_QUEUE_PORT,
      useClass: BullmqQueueAdapter,
    },
  ],
  exports: [BullModule, JOB_QUEUE_PORT],
})
export class QueueModule {}
