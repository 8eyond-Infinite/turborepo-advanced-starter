import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { ISessionStore } from '../../ports/session-store.port';
import type { UserRepository } from '@iam/users/domain/ports/user.repository';
import { RefreshCommand } from '../refresh.command';
import { RefreshCommandHandler } from './refresh.handler';
import { UserEntity } from '@iam/users/domain/user.entity';

describe('RefreshCommandHandler', () => {
  let user: UserEntity;
  const userRepository = {
    findById: jest.fn(),
    getPermissions: jest.fn(),
    nextIdentity: jest.fn(),
  } as unknown as jest.Mocked<UserRepository>;
  const sessionStore = {
    getRefreshTokenSession: jest.fn(),
    getRefreshReplay: jest.fn(),
    rotateRefreshToken: jest.fn(),
    revokeRefreshToken: jest.fn(),
  } as unknown as jest.Mocked<ISessionStore>;
  const jwtService = {
    sign: jest.fn(),
  } as unknown as jest.Mocked<JwtService>;
  const configService = {
    getOrThrow: jest.fn((key: string) => key),
  } as unknown as jest.Mocked<ConfigService>;

  const handler = new RefreshCommandHandler(
    jwtService,
    userRepository,
    sessionStore,
    configService,
  );

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-29T00:00:00.000Z'));
    jest.clearAllMocks();
    user = UserEntity.register({
      id: 'user-id',
      email: 'user@example.com',
      username: 'user',
      passwordHash: 'hashed-password',
    });
    userRepository.findById.mockResolvedValue(user);
    userRepository.getPermissions.mockResolvedValue([]);
    userRepository.nextIdentity.mockReturnValue('new-jti');
    sessionStore.getRefreshTokenSession.mockResolvedValue({
      jti: 'old-jti',
      sessionId: 'stable-session-id',
      ip: '127.0.0.1',
      userAgent: 'test',
      createdAt: '2026-07-29T00:00:00.000Z',
      absoluteExpiresAt: '2026-08-05T00:00:00.000Z',
    });
    sessionStore.getRefreshReplay.mockResolvedValue(null);
    jwtService.sign
      .mockReturnValueOnce('new-access')
      .mockReturnValueOnce('new-refresh');
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns tokens only when the old session is atomically consumed', async () => {
    sessionStore.rotateRefreshToken.mockResolvedValue({
      rotated: true,
      tokens: { accessToken: 'new-access', refreshToken: 'new-refresh' },
    });

    const result = await handler.execute(
      new RefreshCommand('user-id', 'user@example.com', 'old-jti'),
    );

    expect(result.unwrap()).toEqual({
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
    });
    expect(sessionStore.rotateRefreshToken).toHaveBeenCalledWith(
      'user-id',
      'old-jti',
      'new-jti',
      expect.objectContaining({ jti: 'new-jti' }),
      { accessToken: 'new-access', refreshToken: 'new-refresh' },
      604800,
    );
    expect(sessionStore.rotateRefreshToken).toHaveBeenCalledWith(
      'user-id',
      'old-jti',
      'new-jti',
      expect.objectContaining({ sessionId: 'stable-session-id' }),
      { accessToken: 'new-access', refreshToken: 'new-refresh' },
      604800,
    );
    expect(jwtService.sign).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ email: 'user@example.com' }),
      expect.any(Object),
    );
  });

  it('uses the current database email instead of the stale refresh claim', async () => {
    sessionStore.rotateRefreshToken.mockResolvedValue({
      rotated: true,
      tokens: { accessToken: 'new-access', refreshToken: 'new-refresh' },
    });
    user.updateInfo('current@example.com', 'user', null);

    await handler.execute(
      new RefreshCommand('user-id', 'stale@example.com', 'old-jti'),
    );

    expect(jwtService.sign).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ email: 'current@example.com' }),
      expect.any(Object),
    );
    expect(jwtService.sign).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ email: 'current@example.com' }),
      expect.any(Object),
    );
  });

  it('rejects a refresh token already consumed by another request', async () => {
    sessionStore.rotateRefreshToken.mockResolvedValue({
      rotated: false,
      tokens: null,
    });

    const result = await handler.execute(
      new RefreshCommand('user-id', 'user@example.com', 'old-jti'),
    );

    expect(() => result.unwrap()).toThrow(
      'Refresh token has already been used, revoked, or expired',
    );
  });

  it('returns the same tokens when another replica already rotated the session', async () => {
    sessionStore.getRefreshTokenSession.mockResolvedValue(null);
    sessionStore.getRefreshReplay.mockResolvedValue({
      accessToken: 'winner-access',
      refreshToken: 'winner-refresh',
    });

    const result = await handler.execute(
      new RefreshCommand('user-id', 'user@example.com', 'old-jti'),
    );

    expect(result.unwrap()).toEqual({
      accessToken: 'winner-access',
      refreshToken: 'winner-refresh',
    });
    expect(jwtService.sign).not.toHaveBeenCalled();
    expect(sessionStore.rotateRefreshToken).not.toHaveBeenCalled();
  });

  it('returns the winner tokens when rotation loses after reading the old session', async () => {
    sessionStore.rotateRefreshToken.mockResolvedValue({
      rotated: false,
      tokens: {
        accessToken: 'winner-access',
        refreshToken: 'winner-refresh',
      },
    });

    const result = await handler.execute(
      new RefreshCommand('user-id', 'user@example.com', 'old-jti'),
    );

    expect(result.unwrap()).toEqual({
      accessToken: 'winner-access',
      refreshToken: 'winner-refresh',
    });
  });

  it('keeps the original absolute expiry instead of granting another seven days', async () => {
    sessionStore.getRefreshTokenSession.mockResolvedValue({
      jti: 'old-jti',
      sessionId: 'stable-session-id',
      ip: '127.0.0.1',
      userAgent: 'test',
      createdAt: '2026-07-28T00:00:00.000Z',
      absoluteExpiresAt: '2026-07-29T01:00:00.000Z',
    });
    sessionStore.rotateRefreshToken.mockResolvedValue({
      rotated: true,
      tokens: { accessToken: 'new-access', refreshToken: 'new-refresh' },
    });

    await handler.execute(
      new RefreshCommand('user-id', 'user@example.com', 'old-jti'),
    );

    expect(jwtService.sign).toHaveBeenNthCalledWith(
      2,
      expect.any(Object),
      expect.objectContaining({ expiresIn: 3600 }),
    );
    expect(sessionStore.rotateRefreshToken).toHaveBeenCalledWith(
      'user-id',
      'old-jti',
      'new-jti',
      expect.objectContaining({
        absoluteExpiresAt: '2026-07-29T01:00:00.000Z',
      }),
      { accessToken: 'new-access', refreshToken: 'new-refresh' },
      3600,
    );
  });

  it('revokes and rejects a session past its absolute expiry', async () => {
    sessionStore.getRefreshTokenSession.mockResolvedValue({
      jti: 'old-jti',
      sessionId: 'stable-session-id',
      ip: '127.0.0.1',
      userAgent: 'test',
      createdAt: '2026-07-21T00:00:00.000Z',
      absoluteExpiresAt: '2026-07-28T00:00:00.000Z',
    });

    const result = await handler.execute(
      new RefreshCommand('user-id', 'user@example.com', 'old-jti'),
    );

    expect(result.isFailure).toBe(true);
    expect(sessionStore.revokeRefreshToken).toHaveBeenCalledWith(
      'user-id',
      'old-jti',
    );
    expect(jwtService.sign).not.toHaveBeenCalled();
    expect(sessionStore.rotateRefreshToken).not.toHaveBeenCalled();
  });
});
