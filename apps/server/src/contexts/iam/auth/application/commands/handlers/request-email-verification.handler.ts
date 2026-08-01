import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '@iam/users/domain/ports/user.repository';
import { EmailVerificationService } from '../../services/email-verification.service';
import { RequestEmailVerificationCommand } from '../request-email-verification.command';

@CommandHandler(RequestEmailVerificationCommand)
export class RequestEmailVerificationHandler implements ICommandHandler<
  RequestEmailVerificationCommand,
  void
> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    private readonly verification: EmailVerificationService,
  ) {}

  async execute(command: RequestEmailVerificationCommand): Promise<void> {
    const user = await this.users.findByEmail(
      command.email.trim().toLowerCase(),
    );
    if (!user?.isActive || user.isDeleted || user.emailVerifiedAt) return;
    await this.verification.schedule(user);
  }
}
