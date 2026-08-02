import { createHash, randomBytes } from 'crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { UserEntity } from '@iam/users/domain/user.entity';
import {
  JOB_QUEUE_PORT,
  type IJobQueuePort,
} from '@shared/application/ports/job-queue.port';
import {
  USER_JOBS,
  USER_QUEUE,
} from '@iam/users/application/queues/user-queue.constants';
import {
  EMAIL_VERIFICATION_TOKEN_STORE,
  type EmailVerificationTokenStore,
} from '../ports/email-verification-token-store.port';

const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1_000;

@Injectable()
export class EmailVerificationService {
  private readonly logger = new Logger(EmailVerificationService.name);

  constructor(
    @Inject(EMAIL_VERIFICATION_TOKEN_STORE)
    private readonly tokens: EmailVerificationTokenStore,
    @Inject(JOB_QUEUE_PORT) private readonly jobs: IJobQueuePort,
    private readonly config: ConfigService,
  ) {}

  async schedule(user: UserEntity): Promise<void> {
    try {
      const rawToken = randomBytes(32).toString('base64url');
      const tokenHash = createHash('sha256').update(rawToken).digest('hex');
      await this.tokens.issue(
        user.id,
        user.email,
        tokenHash,
        new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS),
      );
      const verificationUrl = new URL(
        '/verify-email',
        this.config.getOrThrow<string>('CLIENT_URL'),
      );
      verificationUrl.searchParams.set('token', rawToken);
      await this.jobs.addJob(
        USER_QUEUE,
        USER_JOBS.SEND_EMAIL_VERIFICATION,
        { email: user.email, verificationUrl: verificationUrl.toString() },
        { sensitive: true },
      );
    } catch (error) {
      this.logger.error(
        'Email verification could not be scheduled',
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
