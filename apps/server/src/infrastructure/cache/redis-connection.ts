import { ConfigService } from '@nestjs/config';
import type { RedisOptions } from 'ioredis';

export const buildRedisConnection = (
  configService: ConfigService,
): RedisOptions => {
  const connectionUrl = configService.get<string>('REDIS_URL')?.trim();
  if (connectionUrl) {
    const url = new URL(connectionUrl);
    if (url.protocol !== 'redis:' && url.protocol !== 'rediss:') {
      throw new Error('REDIS_URL must use the redis or rediss protocol');
    }

    return {
      host: url.hostname,
      port: url.port ? Number(url.port) : 6379,
      username: url.username ? decodeURIComponent(url.username) : undefined,
      password: url.password ? decodeURIComponent(url.password) : undefined,
      ...(url.protocol === 'rediss:' ? { tls: {} } : {}),
    };
  }

  return {
    host: configService.get<string>('REDIS_HOST', 'localhost'),
    port: Number(configService.get<number>('REDIS_PORT', 6380)),
    username: configService.get<string>('REDIS_USERNAME') || undefined,
    password: configService.get<string>('REDIS_PASSWORD') || undefined,
  };
};
