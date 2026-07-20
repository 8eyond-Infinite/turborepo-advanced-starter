import { Module, Global } from '@nestjs/common';
import { RedisService } from './redis.service';
import { CacheEventBridge } from './cache-event.bridge';
import { CACHE_PORT } from '../../domain/ports/cache.port';

@Global()
@Module({
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
