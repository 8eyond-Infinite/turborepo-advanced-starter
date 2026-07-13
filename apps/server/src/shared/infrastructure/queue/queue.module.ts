import { Module, Global } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';

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
    exports: [BullModule],
})
export class QueueModule {}
