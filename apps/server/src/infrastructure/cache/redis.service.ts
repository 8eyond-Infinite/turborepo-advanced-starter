import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { ICachePort } from '@shared/application/ports/cache.port';
import { buildRedisConnection } from './redis-connection';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy, ICachePort {
  private readonly logger = new Logger(RedisService.name);
  private client!: Redis;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const connection = buildRedisConnection(this.configService);
    this.client = new Redis(connection);

    this.client.on('connect', () => {
      this.logger.log(
        `Connected successfully to Redis server at ${connection.host}:${connection.port}`,
      );
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

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const stringifiedValue =
      typeof value === 'string' ? value : JSON.stringify(value);
    if (ttlSeconds) {
      await this.client.set(key, stringifiedValue, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, stringifiedValue);
    }
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async replaceIfPresent(
    sourceKey: string,
    destinationKey: string,
    value: unknown,
    ttlSeconds: number,
  ): Promise<boolean> {
    const script = `
      if redis.call('EXISTS', KEYS[1]) == 0 then
        return 0
      end
      redis.call('DEL', KEYS[1])
      redis.call('SET', KEYS[2], ARGV[1], 'EX', ARGV[2])
      return 1
    `;
    const serialized =
      typeof value === 'string' ? value : JSON.stringify(value);
    const result = await this.client.eval(
      script,
      2,
      sourceKey,
      destinationKey,
      serialized,
      String(ttlSeconds),
    );
    return result === 1;
  }

  async replaceIfPresentOrGetReplay<T>(
    sourceKey: string,
    destinationKey: string,
    replayKey: string,
    destinationValue: unknown,
    replayValue: T,
    destinationTtlSeconds: number,
    replayTtlSeconds: number,
  ): Promise<{ replaced: boolean; replay: T | null }> {
    const script = `
      if redis.call('EXISTS', KEYS[1]) == 1 then
        redis.call('DEL', KEYS[1])
        redis.call('SET', KEYS[2], ARGV[1], 'EX', ARGV[3])
        redis.call('SET', KEYS[3], ARGV[2], 'EX', ARGV[4])
        return {1, ARGV[2]}
      end
      local replay = redis.call('GET', KEYS[3])
      if replay then
        return {0, replay}
      end
      return {0, ''}
    `;
    const serializedDestination =
      typeof destinationValue === 'string'
        ? destinationValue
        : JSON.stringify(destinationValue);
    const serializedReplay =
      typeof replayValue === 'string'
        ? replayValue
        : JSON.stringify(replayValue);
    const result = (await this.client.eval(
      script,
      3,
      sourceKey,
      destinationKey,
      replayKey,
      serializedDestination,
      serializedReplay,
      String(destinationTtlSeconds),
      String(replayTtlSeconds),
    )) as [number, string];

    return {
      replaced: result[0] === 1,
      replay: result[1] ? (JSON.parse(result[1]) as T) : null,
    };
  }

  async ping(): Promise<string> {
    return this.client.ping();
  }

  async invalidatePattern(pattern: string): Promise<void> {
    const keys = await this.scan(pattern);
    for (let index = 0; index < keys.length; index += 500) {
      await this.client.del(...keys.slice(index, index + 500));
    }
  }

  async scan(pattern: string, count = 250): Promise<string[]> {
    const keys: string[] = [];
    let cursor = '0';

    do {
      const [nextCursor, batch] = await this.client.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        count,
      );
      cursor = nextCursor;
      keys.push(...batch);
    } while (cursor !== '0');

    return keys;
  }
}
