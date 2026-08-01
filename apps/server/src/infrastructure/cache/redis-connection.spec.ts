import { ConfigService } from '@nestjs/config';
import { buildRedisConnection } from './redis-connection';

describe('buildRedisConnection', () => {
  it('prefers a managed Redis connection URL', () => {
    const config = new ConfigService({
      REDIS_URL: 'rediss://managed-user:p%40ss@redis.internal:6380',
      REDIS_HOST: 'ignored',
    });

    expect(buildRedisConnection(config)).toEqual({
      host: 'redis.internal',
      port: 6380,
      username: 'managed-user',
      password: 'p@ss',
      tls: {},
    });
  });

  it('keeps host-based local development configuration', () => {
    const config = new ConfigService({
      REDIS_HOST: 'localhost',
      REDIS_PORT: '6380',
      REDIS_USERNAME: 'default',
      REDIS_PASSWORD: '',
    });

    expect(buildRedisConnection(config)).toEqual({
      host: 'localhost',
      port: 6380,
      username: 'default',
      password: undefined,
    });
  });

  it('rejects non-Redis URL schemes', () => {
    const config = new ConfigService({
      REDIS_URL: 'https://redis.example.com',
    });

    expect(() => buildRedisConnection(config)).toThrow(
      'REDIS_URL must use the redis or rediss protocol',
    );
  });
});
