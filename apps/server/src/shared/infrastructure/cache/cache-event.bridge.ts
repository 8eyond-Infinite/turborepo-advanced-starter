import { Injectable, OnModuleInit, Inject, Logger } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { CACHE_PORT } from '../../domain/ports/cache.port';
import type { ICachePort } from '../../domain/ports/cache.port';
import type { ICacheInvalidationEvent } from '../../domain/events/cache-invalidation-event.interface';

@Injectable()
export class CacheEventBridge implements OnModuleInit {
    private readonly logger = new Logger(CacheEventBridge.name);

    constructor(
        private readonly eventBus: EventBus,
        @Inject(CACHE_PORT)
        private readonly cache: ICachePort,
    ) {}

    onModuleInit() {
        this.logger.log('Initializing Cache Event Bridge to listen to all Domain Events...');

        this.eventBus.subject$.subscribe({
            next: async (event) => {
                if (this.isCacheInvalidationEvent(event)) {
                    const keys = event.getCacheKeysToInvalidate();
                    const patterns = event.getCachePatternsToInvalidate();

                    this.logger.log(`Bridging Domain Event to Cache Invalidation: KeysCount=${keys.length} PatternsCount=${patterns.length}`);

                    try {
                        for (const key of keys) {
                            await this.cache.del(key);
                            this.logger.log(`Successfully invalidated cache key: ${key}`);
                        }

                        for (const pattern of patterns) {
                            await this.cache.invalidatePattern(pattern);
                            this.logger.log(`Successfully invalidated cache pattern: ${pattern}`);
                        }
                    } catch (error: any) {
                        this.logger.error(`Failed to execute cache invalidation for event: ${error.message}`);
                    }
                }
            },
            error: (err) => {
                this.logger.error(`Error in event stream: ${err.message}`);
            }
        });
    }

    private isCacheInvalidationEvent(event: any): event is ICacheInvalidationEvent {
        return event && (typeof event.getCacheKeysToInvalidate === 'function' || typeof event.getCachePatternsToInvalidate === 'function');
    }
}
