import { createHash } from 'crypto';
import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import {
  EMAIL_VERIFICATION_TOKEN_STORE,
  type EmailVerificationTokenStore,
} from '../../ports/email-verification-token-store.port';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '@iam/users/domain/ports/user.repository';
import { InvalidEmailVerificationTokenException } from '../../../domain/exceptions/invalid-email-verification-token.exception';
import { VerifyEmailCommand } from '../verify-email.command';

@CommandHandler(VerifyEmailCommand)
export class VerifyEmailHandler implements ICommandHandler<
  VerifyEmailCommand,
  void
> {
  constructor(
    @Inject(EMAIL_VERIFICATION_TOKEN_STORE)
    private readonly tokens: EmailVerificationTokenStore,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
  ) {}

  async execute(command: VerifyEmailCommand): Promise<void> {
    const hash = createHash('sha256').update(command.token).digest('hex');
    const subject = await this.tokens.consume(hash, new Date());
    if (!subject) throw new InvalidEmailVerificationTokenException();
    const verified = await this.users.markEmailVerified(
      subject.userId,
      subject.email,
      new Date(),
    );
    if (!verified) throw new InvalidEmailVerificationTokenException();
  }
}
