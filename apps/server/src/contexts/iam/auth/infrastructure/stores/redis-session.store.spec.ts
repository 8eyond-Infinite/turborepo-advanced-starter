import type { RedisService } from '@infrastructure/cache/redis.service';
import type { ConfigService } from '@nestjs/config';
import { RedisSessionStore } from './redis-session.store';

describe('RedisSessionStore', () => {
  const config = {
    getOrThrow: jest.fn().mockReturnValue('test-refresh-secret'),
  } as unknown as ConfigService;

  it('rotates a session and publishes a five-second replay atomically', async () => {
    const cache = {
      replaceIfPresentOrGetReplay: jest
        .fn()
        .mockImplementation((...args: unknown[]) =>
          Promise.resolve({ replaced: true, replay: args[4] }),
        ),
    } as unknown as RedisService;
    const store = new RedisSessionStore(cache, config);
    const session = {
      jti: 'new-jti',
      sessionId: 'session-id',
      ip: '127.0.0.1',
      userAgent: 'test',
      createdAt: '2026-07-29T00:00:00.000Z',
    };
    const tokens = { accessToken: 'access', refreshToken: 'refresh' };

    await expect(
      store.rotateRefreshToken(
        'user-id',
        'old-jti',
        'new-jti',
        session,
        tokens,
        3600,
      ),
    ).resolves.toEqual({ rotated: true, tokens });
    expect(cache.replaceIfPresentOrGetReplay).toHaveBeenCalledWith(
      'refresh_token:user-id:old-jti',
      'refresh_token:user-id:new-jti',
      'refresh_replay:user-id:old-jti',
      session,
      expect.objectContaining({
        successorJti: 'new-jti',
        encryptedTokens: expect.any(String),
      }),
      3600,
      5,
    );
  });

  it('removes both active sessions and short-lived replay records on logout-all', async () => {
    const cache = {
      invalidatePattern: jest.fn().mockResolvedValue(undefined),
    } as unknown as RedisService;
    const store = new RedisSessionStore(cache, config);

    await store.revokeAllUserSessions('user-id');

    expect(cache.invalidatePattern).toHaveBeenCalledWith(
      'refresh_token:user-id:*',
    );
    expect(cache.invalidatePattern).toHaveBeenCalledWith(
      'refresh_replay:user-id:*',
    );
  });

  it('removes replay records that could resurrect a revoked successor', async () => {
    const cache = {
      scan: jest.fn().mockResolvedValue(['refresh_replay:user-id:old-jti']),
      get: jest.fn().mockResolvedValue({
        successorJti: 'current-jti',
        encryptedTokens: 'encrypted-value-not-read-by-revoke',
      }),
      del: jest.fn().mockResolvedValue(undefined),
    } as unknown as RedisService;
    const store = new RedisSessionStore(cache, config);

    await store.revokeRefreshToken('user-id', 'current-jti');

    expect(cache.del).toHaveBeenCalledWith('refresh_replay:user-id:old-jti');
  });

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
    const store = new RedisSessionStore(cache, config);

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
      invalidatePattern: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
    } as unknown as RedisService;
    const store = new RedisSessionStore(cache, config);

    await store.revokeOtherUserSessions('user-id', 'current-session-id');

    expect(cache.del).toHaveBeenCalledTimes(1);
    expect(cache.del).toHaveBeenCalledWith('refresh_token:user-id:other-jti');
  });
});
