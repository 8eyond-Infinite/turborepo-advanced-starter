import { ConfigService } from '@nestjs/config';
import type { Job } from 'bullmq';
import { USER_JOBS } from './user-queue.constants';
import { UserQueueProcessor } from './user-queue.processor';

describe('UserQueueProcessor', () => {
  it('completes an email job as explicitly skipped when mail is disabled', async () => {
    const processor = new UserQueueProcessor(
      new ConfigService({ MAIL_ENABLED: false }),
    );

    const result = await processor.process({
      id: 'job-1',
      name: USER_JOBS.SEND_WELCOME_EMAIL,
      data: { email: 'member@example.com' },
    } as Job<{ email: string }, { sent: boolean; email: string }, string>);

    expect(result).toEqual({
      sent: false,
      email: 'member@example.com',
    });
  });
});
