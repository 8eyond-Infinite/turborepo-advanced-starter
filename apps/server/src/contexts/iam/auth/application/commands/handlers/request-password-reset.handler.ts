import { createHash, randomBytes } from 'crypto';
import { Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '@iam/users/domain/ports/user.repository';
import {
  JOB_QUEUE_PORT,
  type IJobQueuePort,
} from '@shared/application/ports/job-queue.port';
import {
  USER_JOBS,
  USER_QUEUE,
} from '@iam/users/application/queues/user-queue.constants';
import {
  PASSWORD_RESET_TOKEN_STORE,
  type PasswordResetTokenStore,
} from '../../ports/password-reset-token-store.port';
import { RequestPasswordResetCommand } from '../request-password-reset.command';

const RESET_TOKEN_TTL_MS = 30 * 60 * 1_000;

@CommandHandler(RequestPasswordResetCommand)
export class RequestPasswordResetHandler implements ICommandHandler<
  RequestPasswordResetCommand,
  void
> {
  private readonly logger = new Logger(RequestPasswordResetHandler.name);

  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PASSWORD_RESET_TOKEN_STORE)
    private readonly tokens: PasswordResetTokenStore,
    @Inject(JOB_QUEUE_PORT) private readonly jobs: IJobQueuePort,
    private readonly config: ConfigService,
  ) {}

  async execute(command: RequestPasswordResetCommand): Promise<void> {
    const user = await this.users.findByEmail(
      command.email.trim().toLowerCase(),
    );
    if (!user?.isActive || user.isDeleted) return;

    try {
      const rawToken = randomBytes(32).toString('base64url');
      const tokenHash = createHash('sha256').update(rawToken).digest('hex');
      await this.tokens.issue(
        user.id,
        tokenHash,
        new Date(Date.now() + RESET_TOKEN_TTL_MS),
      );

      const resetUrl = new URL(
        '/reset-password',
        this.config.getOrThrow<string>('CLIENT_URL'),
      );
      resetUrl.searchParams.set('token', rawToken);
      await this.jobs.addJob(
        USER_QUEUE,
        USER_JOBS.SEND_PASSWORD_RESET_EMAIL,
        {
          email: user.email,
          resetUrl: resetUrl.toString(),
        },
        { sensitive: true },
      );
    } catch (error) {
      this.logger.error(
        'Password reset request could not be scheduled',
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
