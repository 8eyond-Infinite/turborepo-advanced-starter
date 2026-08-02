import { ConfigService } from '@nestjs/config';
import { UserEntity } from '@iam/users/domain/user.entity';
import type { UserRepository } from '@iam/users/domain/ports/user.repository';
import type { IJobQueuePort } from '@shared/application/ports/job-queue.port';
import type { PasswordResetTokenStore } from '../../ports/password-reset-token-store.port';
import { RequestPasswordResetCommand } from '../request-password-reset.command';
import { RequestPasswordResetHandler } from './request-password-reset.handler';

const user = UserEntity.register({
  id: 'user-id',
  email: 'member@example.com',
  username: 'member',
  passwordHash: 'hash',
});

describe('RequestPasswordResetHandler', () => {
  const users = {
    findByEmail: jest.fn(),
  } as unknown as jest.Mocked<UserRepository>;
  const tokens = {
    issue: jest.fn(),
  } as unknown as jest.Mocked<PasswordResetTokenStore>;
  const jobs = { addJob: jest.fn() } as unknown as jest.Mocked<IJobQueuePort>;
  const handler = new RequestPasswordResetHandler(
    users,
    tokens,
    jobs,
    new ConfigService({ CLIENT_URL: 'https://client.example.com' }),
  );

  beforeEach(() => jest.clearAllMocks());

  it('does nothing and returns normally when the email is unknown', async () => {
    users.findByEmail.mockResolvedValue(null);
    await expect(
      handler.execute(new RequestPasswordResetCommand('unknown@example.com')),
    ).resolves.toBeUndefined();
    expect(tokens.issue).not.toHaveBeenCalled();
    expect(jobs.addJob).not.toHaveBeenCalled();
  });

  it('stores only a hash and queues the one-time raw token in the reset URL', async () => {
    users.findByEmail.mockResolvedValue(user);
    await handler.execute(
      new RequestPasswordResetCommand(' MEMBER@EXAMPLE.COM '),
    );

    expect(users.findByEmail).toHaveBeenCalledWith('member@example.com');
    const storedHash = tokens.issue.mock.calls[0][1];
    const payload = jobs.addJob.mock.calls[0][2] as { resetUrl: string };
    expect(jobs.addJob.mock.calls[0][3]).toEqual({ sensitive: true });
    const rawToken = new URL(payload.resetUrl).searchParams.get('token');
    expect(rawToken).toHaveLength(43);
    expect(storedHash).toHaveLength(64);
    expect(payload.resetUrl).not.toContain(storedHash);
  });

  it('keeps the public outcome uniform when reset delivery cannot be scheduled', async () => {
    users.findByEmail.mockResolvedValue(user);
    jobs.addJob.mockRejectedValue(new Error('queue unavailable'));
    await expect(
      handler.execute(new RequestPasswordResetCommand(user.email)),
    ).resolves.toBeUndefined();
  });
});
