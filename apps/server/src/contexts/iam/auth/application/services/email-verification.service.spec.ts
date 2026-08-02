import { ConfigService } from '@nestjs/config';
import { UserEntity } from '@iam/users/domain/user.entity';
import type { IJobQueuePort } from '@shared/application/ports/job-queue.port';
import type { EmailVerificationTokenStore } from '../ports/email-verification-token-store.port';
import { EmailVerificationService } from './email-verification.service';

describe('EmailVerificationService', () => {
  it('stores only a hash and marks the mail job as sensitive', async () => {
    const tokens = {
      issue: jest.fn(),
    } as unknown as jest.Mocked<EmailVerificationTokenStore>;
    const jobs = { addJob: jest.fn() } as unknown as jest.Mocked<IJobQueuePort>;
    const service = new EmailVerificationService(
      tokens,
      jobs,
      new ConfigService({ CLIENT_URL: 'https://client.example.com' }),
    );
    const user = UserEntity.register({
      id: 'user-id',
      email: 'member@example.com',
      username: 'member',
      passwordHash: 'hash',
    });

    await service.schedule(user);

    expect(tokens.issue.mock.calls[0][1]).toBe('member@example.com');
    const storedHash = tokens.issue.mock.calls[0][2];
    const payload = jobs.addJob.mock.calls[0][2] as { verificationUrl: string };
    const rawToken = new URL(payload.verificationUrl).searchParams.get('token');
    expect(storedHash).toHaveLength(64);
    expect(rawToken).toHaveLength(43);
    expect(payload.verificationUrl).not.toContain(storedHash);
    expect(jobs.addJob.mock.calls[0][3]).toEqual({ sensitive: true });
  });
});
