import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { StoragePort } from './domain/ports/storage.port';
import { LocalStorageAdapter } from './infrastructure/adapters/local-storage.adapter';
import { S3StorageAdapter } from './infrastructure/adapters/s3-storage.adapter';
import { StorageController } from './presentation/controllers/storage.controller';

@Module({
    imports: [ConfigModule],
    controllers: [StorageController],
    providers: [
        {
            provide: StoragePort,
            useFactory: (configService: ConfigService) => {
                const provider = configService.get<string>('STORAGE_PROVIDER', 'local');
                if (provider === 's3') {
                    return new S3StorageAdapter(configService);
                }
                return new LocalStorageAdapter(configService);
            },
            inject: [ConfigService],
        },
    ],
    exports: [StoragePort],
})
export class StorageModule {}
