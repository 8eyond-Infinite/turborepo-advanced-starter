import type { RedisService } from '@infrastructure/cache/redis.service';
import { RedisSessionStore } from './redis-session.store';

describe('RedisSessionStore', () => {
  it('omits a session that expires between SCAN and GET', async () => {
    const activeSession = {
      jti: 'active-jti',
      ip: '127.0.0.1',
      userAgent: 'test-agent',
      createdAt: '2026-07-29T00:00:00.000Z',
    };
    const cache = {
      scan: jest
        .fn()
        .mockResolvedValue([
          'refresh_token:user-id:active-jti',
          'refresh_token:user-id:expired-jti',
        ]),
      get: jest
        .fn()
        .mockResolvedValueOnce(activeSession)
        .mockResolvedValueOnce(null),
    } as unknown as RedisService;
    const store = new RedisSessionStore(cache);

    await expect(store.getUserSessions('user-id')).resolves.toEqual([
      activeSession,
    ]);
  });
});
