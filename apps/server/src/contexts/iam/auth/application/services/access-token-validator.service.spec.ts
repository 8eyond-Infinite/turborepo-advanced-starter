import { AccessTokenValidator } from './access-token-validator.service';

describe('AccessTokenValidator', () => {
  const userRepository = {
    findById: jest.fn(),
  };
  const sessionStore = {
    isRefreshTokenValid: jest.fn(),
  };
  const payload = {
    sub: 'user-1',
    email: 'member@example.com',
    permissions: [],
    tokenVersion: 2,
    jti: 'session-jti',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns a principal only while both user and session are active', async () => {
    userRepository.findById.mockResolvedValue({
      isActive: true,
      isDeleted: false,
      tokenVersion: 2,
    });
    sessionStore.isRefreshTokenValid.mockResolvedValue(true);
    const validator = new AccessTokenValidator(
      userRepository as never,
      sessionStore as never,
    );

    await expect(validator.validate(payload)).resolves.toEqual({
      ...payload,
      id: 'user-1',
    });
  });

  it('rejects a revoked user token before reading the session store', async () => {
    userRepository.findById.mockResolvedValue({
      isActive: true,
      isDeleted: false,
      tokenVersion: 3,
    });
    const validator = new AccessTokenValidator(
      userRepository as never,
      sessionStore as never,
    );

    await expect(validator.validate(payload)).resolves.toBeNull();
    expect(sessionStore.isRefreshTokenValid).not.toHaveBeenCalled();
  });

  it('rejects a revoked session', async () => {
    userRepository.findById.mockResolvedValue({
      isActive: true,
      isDeleted: false,
      tokenVersion: 2,
    });
    sessionStore.isRefreshTokenValid.mockResolvedValue(false);
    const validator = new AccessTokenValidator(
      userRepository as never,
      sessionStore as never,
    );

    await expect(validator.validate(payload)).resolves.toBeNull();
  });
});
