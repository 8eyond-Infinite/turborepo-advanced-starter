import { Module, Global } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullmqQueueAdapter } from './bullmq-queue.adapter';
import { JOB_QUEUE_PORT } from '../../domain/ports/job-queue.port';

@Global()
@Module({
    imports: [
        BullModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                connection: {
                    host: configService.get<string>('REDIS_HOST', 'localhost'),
                    port: Number(configService.get<number>('REDIS_PORT', 6380)),
                    password: configService.get<string>('REDIS_PASSWORD') || undefined,
                },
            }),
        }),
    ],
    providers: [
        BullmqQueueAdapter,
        {
            provide: JOB_QUEUE_PORT,
            useClass: BullmqQueueAdapter,
        },
    ],
    exports: [
        BullModule,
        JOB_QUEUE_PORT,
    ],
})
export class QueueModule {}
