import type { UserRepository } from '@iam/users/domain/ports/user.repository';
import type { EmailVerificationTokenStore } from '../../ports/email-verification-token-store.port';
import { InvalidEmailVerificationTokenException } from '../../../domain/exceptions/invalid-email-verification-token.exception';
import { VerifyEmailCommand } from '../verify-email.command';
import { VerifyEmailHandler } from './verify-email.handler';

describe('VerifyEmailHandler', () => {
  const tokens = {
    consume: jest.fn(),
  } as unknown as jest.Mocked<EmailVerificationTokenStore>;
  const users = {
    markEmailVerified: jest.fn(),
  } as unknown as jest.Mocked<UserRepository>;
  const handler = new VerifyEmailHandler(tokens, users);

  beforeEach(() => jest.clearAllMocks());

  it('rejects an invalid, expired, or reused token uniformly', async () => {
    tokens.consume.mockResolvedValue(null);
    await expect(
      handler.execute(new VerifyEmailCommand('invalid')),
    ).rejects.toBeInstanceOf(InvalidEmailVerificationTokenException);
  });

  it('marks the token owner verified after atomic consumption', async () => {
    tokens.consume.mockResolvedValue({
      userId: 'user-id',
      email: 'member@example.com',
    });
    users.markEmailVerified.mockResolvedValue(true);
    await handler.execute(new VerifyEmailCommand('valid-token'));
    expect(users.markEmailVerified).toHaveBeenCalledWith(
      'user-id',
      'member@example.com',
      expect.any(Date),
    );
  });

  it('rejects a token when the account email changed after issuance', async () => {
    tokens.consume.mockResolvedValue({
      userId: 'user-id',
      email: 'old@example.com',
    });
    users.markEmailVerified.mockResolvedValue(false);

    await expect(
      handler.execute(new VerifyEmailCommand('valid-old-token')),
    ).rejects.toBeInstanceOf(InvalidEmailVerificationTokenException);
    expect(users.markEmailVerified).toHaveBeenCalledWith(
      'user-id',
      'old@example.com',
      expect.any(Date),
    );
  });
});
