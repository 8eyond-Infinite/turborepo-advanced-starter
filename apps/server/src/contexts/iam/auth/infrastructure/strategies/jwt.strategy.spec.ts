import type { JwtPayload } from '@repo/contracts';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import type { UserRepository } from '@iam/users/domain/ports/user.repository';
import { UserEntity } from '@iam/users/domain/user.entity';
import type { ISessionStore } from '../../domain/ports/session-store.port';

describe('JwtStrategy', () => {
  const createSessionStore = (active = true) =>
    ({
      isRefreshTokenValid: jest.fn().mockResolvedValue(active),
    }) as unknown as ISessionStore;

  it('maps the JWT subject to the canonical authenticated user id', async () => {
    const config = {
      getOrThrow: jest.fn().mockReturnValue('test-access-secret'),
    } as unknown as ConfigService;
    const user = UserEntity.register({
      id: 'user-id',
      email: 'user@example.com',
      username: 'user',
      passwordHash: 'hashed',
    });
    user.pullDomainEvents();
    const repository = {
      findById: jest.fn().mockResolvedValue(user),
    } as unknown as UserRepository;
    const sessionStore = createSessionStore();
    const strategy = new JwtStrategy(config, repository, sessionStore);
    const payload: JwtPayload = {
      sub: 'user-id',
      email: 'user@example.com',
      permissions: [],
      tokenVersion: 0,
      jti: 'session-id',
    };

    await expect(strategy.validate(payload)).resolves.toEqual({
      ...payload,
      id: 'user-id',
    });
  });

  it('rejects tokens issued before a security-sensitive user change', async () => {
    const config = {
      getOrThrow: jest.fn().mockReturnValue('test-access-secret'),
    } as unknown as ConfigService;
    const user = UserEntity.register({
      id: 'user-id',
      email: 'user@example.com',
      username: 'user',
      passwordHash: 'hashed',
    });
    user.updateRoles(['ADMIN']);
    const repository = {
      findById: jest.fn().mockResolvedValue(user),
    } as unknown as UserRepository;
    const strategy = new JwtStrategy(config, repository, createSessionStore());

    await expect(
      strategy.validate({
        sub: user.id,
        email: user.email,
        permissions: [],
        tokenVersion: 0,
        jti: 'session-id',
      }),
    ).rejects.toThrow('Access token has been revoked');
  });

  it('rejects an access token after its individual session is revoked', async () => {
    const config = {
      getOrThrow: jest.fn().mockReturnValue('test-access-secret'),
    } as unknown as ConfigService;
    const user = UserEntity.register({
      id: 'user-id',
      email: 'user@example.com',
      username: 'user',
      passwordHash: 'hashed',
    });
    const repository = {
      findById: jest.fn().mockResolvedValue(user),
    } as unknown as UserRepository;
    const strategy = new JwtStrategy(
      config,
      repository,
      createSessionStore(false),
    );

    await expect(
      strategy.validate({
        sub: user.id,
        email: user.email,
        permissions: [],
        tokenVersion: user.tokenVersion,
        jti: 'revoked-session-id',
      }),
    ).rejects.toThrow('Session has been revoked');
  });
});
