import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { ISessionStore } from '../../../domain/ports/session-store.port';
import type { UserRepository } from '@iam/users/domain/ports/user.repository';
import { RefreshCommand } from '../refresh.command';
import { RefreshCommandHandler } from './refresh.handler';
import { UserEntity } from '@iam/users/domain/user.entity';

describe('RefreshCommandHandler', () => {
  const user = UserEntity.register({
    id: 'user-id',
    email: 'user@example.com',
    username: 'user',
    passwordHash: 'hashed-password',
  });
  const userRepository = {
    findById: jest.fn(),
    getPermissions: jest.fn(),
    nextIdentity: jest.fn(),
  } as unknown as jest.Mocked<UserRepository>;
  const sessionStore = {
    getRefreshTokenSession: jest.fn(),
    rotateRefreshToken: jest.fn(),
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
    jest.clearAllMocks();
    userRepository.findById.mockResolvedValue(user);
    userRepository.getPermissions.mockResolvedValue([]);
    userRepository.nextIdentity.mockReturnValue('new-jti');
    sessionStore.getRefreshTokenSession.mockResolvedValue({
      jti: 'old-jti',
      ip: '127.0.0.1',
      userAgent: 'test',
      createdAt: new Date().toISOString(),
    });
    jwtService.sign
      .mockReturnValueOnce('new-access')
      .mockReturnValueOnce('new-refresh');
  });

  it('returns tokens only when the old session is atomically consumed', async () => {
    sessionStore.rotateRefreshToken.mockResolvedValue(true);

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
      604800,
    );
  });

  it('rejects a refresh token already consumed by another request', async () => {
    sessionStore.rotateRefreshToken.mockResolvedValue(false);

    const result = await handler.execute(
      new RefreshCommand('user-id', 'user@example.com', 'old-jti'),
    );

    expect(() => result.unwrap()).toThrow(
      'Refresh token has already been used, revoked, or expired',
    );
  });
});
