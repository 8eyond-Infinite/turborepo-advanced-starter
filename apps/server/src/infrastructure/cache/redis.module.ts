import { Module, Global } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { RedisService } from './redis.service';
import { CacheEventBridge } from '@infrastructure/event-bus/bridges/cache.bridge';
import { CACHE_PORT } from '@shared/domain/ports/cache.port';

@Global()
@Module({
    imports: [CqrsModule],
    providers: [
        RedisService,
        CacheEventBridge,
        {
            provide: CACHE_PORT,
            useClass: RedisService,
        },
    ],
    exports: [
        RedisService,
        CACHE_PORT,
    ],
})
export class RedisModule {}
