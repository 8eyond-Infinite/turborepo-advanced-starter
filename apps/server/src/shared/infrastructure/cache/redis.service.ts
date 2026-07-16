import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(RedisService.name);
    private client: Redis;

    constructor(private readonly configService: ConfigService) {}

    onModuleInit() {
        const host = this.configService.get<string>('REDIS_HOST', 'localhost');
        const port = Number(this.configService.get<number>('REDIS_PORT', 6380));
        const password = this.configService.get<string>('REDIS_PASSWORD');

        this.client = new Redis({
            host,
            port,
            password: password || undefined,
        });

        this.client.on('connect', () => {
            this.logger.log(`Connected successfully to Redis server at ${host}:${port}`);
        });

        this.client.on('error', (err) => {
            this.logger.error(`Redis client connection error: ${err.message}`);
        });
    }

    async onModuleDestroy() {
        await this.client.quit();
    }

    async get<T>(key: string): Promise<T | null> {
        const data = await this.client.get(key);
        if (!data) return null;
        try {
            return JSON.parse(data) as T;
        } catch {
            return data as unknown as T;
        }
    }

    async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
        const stringifiedValue = typeof value === 'string' ? value : JSON.stringify(value);
        if (ttlSeconds) {
            await this.client.set(key, stringifiedValue, 'EX', ttlSeconds);
        } else {
            await this.client.set(key, stringifiedValue);
        }
    }

    async del(key: string): Promise<void> {
        await this.client.del(key);
    }

    async invalidatePattern(pattern: string): Promise<void> {
        const keys = await this.client.keys(pattern);
        if (keys.length > 0) {
            await this.client.del(...keys);
        }
    }

    async keys(pattern: string): Promise<string[]> {
        return await this.client.keys(pattern);
    }
}
