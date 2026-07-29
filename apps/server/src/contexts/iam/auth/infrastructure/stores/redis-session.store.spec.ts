import type { RedisService } from '@infrastructure/cache/redis.service';
import { RedisSessionStore } from './redis-session.store';

describe('RedisSessionStore', () => {
  it('omits a session that expires between SCAN and GET', async () => {
    const activeSession = {
      jti: 'active-jti',
      sessionId: 'active-session-id',
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

  it('preserves a rotated current session by stable session id', async () => {
    const cache = {
      scan: jest
        .fn()
        .mockResolvedValue([
          'refresh_token:user-id:new-current-jti',
          'refresh_token:user-id:other-jti',
        ]),
      get: jest
        .fn()
        .mockResolvedValueOnce({
          jti: 'new-current-jti',
          sessionId: 'current-session-id',
        })
        .mockResolvedValueOnce({
          jti: 'other-jti',
          sessionId: 'other-session-id',
        }),
      del: jest.fn().mockResolvedValue(undefined),
    } as unknown as RedisService;
    const store = new RedisSessionStore(cache);

    await store.revokeOtherUserSessions('user-id', 'current-session-id');

    expect(cache.del).toHaveBeenCalledTimes(1);
    expect(cache.del).toHaveBeenCalledWith('refresh_token:user-id:other-jti');
  });
});
