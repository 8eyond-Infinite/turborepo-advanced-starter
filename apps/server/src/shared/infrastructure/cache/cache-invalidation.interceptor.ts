import {
    CallHandler,
    ExecutionContext,
    Injectable,
    NestInterceptor,
    Logger,
    SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { RedisService } from './redis.service';

export const CACHE_INVALIDATE_METADATA = 'cache_invalidate';

export const InvalidateCache = (...keys: string[]) => SetMetadata(CACHE_INVALIDATE_METADATA, keys);

@Injectable()
export class CacheInvalidationInterceptor implements NestInterceptor {
    private readonly logger = new Logger(CacheInvalidationInterceptor.name);

    constructor(
        private readonly reflector: Reflector,
        private readonly redisService: RedisService,
    ) {}

    async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
        const handler = context.getHandler();
        const controller = context.getClass();

        const invalidateKeys = this.reflector.getAllAndOverride<string[]>(CACHE_INVALIDATE_METADATA, [handler, controller]);

        return next.handle().pipe(
            tap(async () => {
                if (!invalidateKeys || invalidateKeys.length === 0) {
                    return;
                }

                const request = context.switchToHttp().getRequest();

                for (const template of invalidateKeys) {
                    const key = this.resolveKeyTemplate(template, request);
                    try {
                        if (key.endsWith('*')) {
                            await this.redisService.invalidatePattern(key);
                            this.logger.debug(`Invalidated cache pattern: ${key}`);
                        } else {
                            await this.redisService.del(key);
                            this.logger.debug(`Deleted cache key: ${key}`);
                        }
                    } catch (error) {
                        this.logger.error(`Error invalidating cache key ${key}: ${error.message}`);
                    }
                }
            }),
        );
    }

    private resolveKeyTemplate(template: string, request: any): string {
        let key = template;

        // Replace route params, e.g. {id}
        if (request.params) {
            for (const param of Object.keys(request.params)) {
                key = key.replace(`{${param}}`, request.params[param]);
            }
        }

        // Replace query params, e.g. {queryParam}
        if (request.query) {
            for (const q of Object.keys(request.query)) {
                key = key.replace(`{${q}}`, request.query[q]);
            }
        }

        // Replace user ID, e.g. {userId}
        const user = request.user;
        if (user) {
            const actualUser = user.user || user;
            if (actualUser && actualUser.id) {
                key = key.replace('{userId}', actualUser.id);
            }
        }

        return key;
    }
}
