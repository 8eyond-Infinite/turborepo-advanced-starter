import { Module, Global } from '@nestjs/common';
import { RedisService } from './redis.service';
import { CACHE_PORT } from '../../domain/ports/cache.port';

@Global()
@Module({
    providers: [
        RedisService,
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
