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
import { mergeMap } from 'rxjs/operators';
import { RedisService } from '../redis.service';
import type { AuthenticatedRequest } from '@presentation/http/authenticated-request';

export const CACHE_INVALIDATE_METADATA = 'cache_invalidate';

export const InvalidateCache = (...keys: string[]) =>
  SetMetadata(CACHE_INVALIDATE_METADATA, keys);

@Injectable()
export class CacheInvalidationInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CacheInvalidationInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly redisService: RedisService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const handler = context.getHandler();
    const controller = context.getClass();

    const invalidateKeys = this.reflector.getAllAndOverride<string[]>(
      CACHE_INVALIDATE_METADATA,
      [handler, controller],
    );

    return next.handle().pipe(
      mergeMap(async (response: unknown) => {
        if (!invalidateKeys || invalidateKeys.length === 0) {
          return response;
        }

        const request = context
          .switchToHttp()
          .getRequest<AuthenticatedRequest>();

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
          } catch (error: unknown) {
            this.logger.error(
              `Error invalidating cache key ${key}: ${this.getErrorMessage(error)}`,
            );
          }
        }

        return response;
      }),
    );
  }

  private resolveKeyTemplate(
    template: string,
    request: AuthenticatedRequest,
  ): string {
    let key = template;

    // Replace route params, e.g. {id}
    if (request.params) {
      for (const param of Object.keys(request.params)) {
        const value = request.params[param];
        if (typeof value === 'string') {
          key = key.replace(`{${param}}`, value);
        }
      }
    }

    if (request.query) {
      for (const q of Object.keys(request.query)) {
        const value = request.query[q];
        if (typeof value === 'string') key = key.replace(`{${q}}`, value);
      }
    }

    if (request.user) {
      key = key.replace('{userId}', request.user.id);
    }

    return key;
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
