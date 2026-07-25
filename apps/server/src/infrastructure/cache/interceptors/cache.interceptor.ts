import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  Logger,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, of } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { RedisService } from '../redis.service';
import type { AuthenticatedRequest } from '@presentation/http/authenticated-request';

export const CACHE_TTL_METADATA = 'cache_ttl';
export const CACHE_KEY_METADATA = 'cache_key';

export const CacheTTL = (ttlSeconds: number) =>
  SetMetadata(CACHE_TTL_METADATA, ttlSeconds);
export const CacheKey = (key: string) => SetMetadata(CACHE_KEY_METADATA, key);

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CacheInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly redisService: RedisService,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    // Only cache GET requests
    if (request.method !== 'GET') {
      return next.handle();
    }

    const handler = context.getHandler();
    const controller = context.getClass();

    // Get TTL and Key options from metadata
    const ttl =
      this.reflector.getAllAndOverride<number>(CACHE_TTL_METADATA, [
        handler,
        controller,
      ]) || 300; // default 5m
    const cacheKeyTemplate = this.reflector.getAllAndOverride<string>(
      CACHE_KEY_METADATA,
      [handler, controller],
    );

    // Generate cache key
    const cacheKey = this.generateCacheKey(request, cacheKeyTemplate, context);

    try {
      const cachedResponse = await this.redisService.get<unknown>(cacheKey);
      if (cachedResponse !== null) {
        this.logger.debug(`Cache hit for key: ${cacheKey}`);
        return of(cachedResponse);
      }
    } catch (error: unknown) {
      this.logger.error(
        `Error reading from cache: ${this.getErrorMessage(error)}`,
      );
    }

    this.logger.debug(
      `Cache miss for key: ${cacheKey}. Fetching from source...`,
    );

    return next.handle().pipe(
      mergeMap(async (response: unknown) => {
        if (response !== undefined) {
          try {
            await this.redisService.set(cacheKey, response, ttl);
            this.logger.debug(
              `Cached response for key: ${cacheKey} with TTL: ${ttl}s`,
            );
          } catch (error: unknown) {
            this.logger.error(
              `Error writing to cache: ${this.getErrorMessage(error)}`,
            );
          }
        }
        return response;
      }),
    );
  }

  private generateCacheKey(
    request: AuthenticatedRequest,
    template?: string,
    context?: ExecutionContext,
  ): string {
    if (template) {
      let key = template;
      if (request.user) {
        key = key.replace('{userId}', request.user.id);
      }
      return key;
    }

    const handlerName = context?.getHandler().name || 'default';
    const controllerName = context?.getClass().name || 'default';
    return `http_cache:${controllerName}:${handlerName}:${request.url}`;
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
