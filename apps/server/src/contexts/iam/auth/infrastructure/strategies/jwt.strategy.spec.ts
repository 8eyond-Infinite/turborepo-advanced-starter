import type { JwtPayload } from '@shared/application/auth/jwt-payload';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import type { AccessTokenValidator } from '../../application/services/access-token-validator.service';

describe('JwtStrategy', () => {
  const config = {
    getOrThrow: jest.fn().mockReturnValue('test-access-secret'),
  } as unknown as ConfigService;
  const payload: JwtPayload = {
    sub: 'user-id',
    email: 'user@example.com',
    permissions: [],
    tokenVersion: 0,
    jti: 'session-id',
  };

  it('returns the principal produced by the shared validator', async () => {
    const principal = { ...payload, id: payload.sub };
    const validator = {
      validate: jest.fn().mockResolvedValue(principal),
    } as unknown as AccessTokenValidator;
    const strategy = new JwtStrategy(config, validator);

    await expect(strategy.validate(payload)).resolves.toEqual(principal);
  });

  it('maps a rejected principal to an HTTP unauthorized error', async () => {
    const validator = {
      validate: jest.fn().mockResolvedValue(null),
    } as unknown as AccessTokenValidator;
    const strategy = new JwtStrategy(config, validator);

    await expect(strategy.validate(payload)).rejects.toThrow(
      'Access token has been revoked',
    );
  });
});
