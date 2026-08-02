import { createHash } from 'crypto';
import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import {
  PASSWORD_HASHER,
  type PasswordHasher,
} from '@iam/users/application/ports/password-hasher.port';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '@iam/users/domain/ports/user.repository';
import {
  SESSION_STORE,
  type ISessionStore,
} from '../../ports/session-store.port';
import {
  PASSWORD_RESET_TOKEN_STORE,
  type PasswordResetTokenStore,
} from '../../ports/password-reset-token-store.port';
import { InvalidPasswordResetTokenException } from '../../../domain/exceptions/invalid-password-reset-token.exception';
import { ResetPasswordCommand } from '../reset-password.command';

@CommandHandler(ResetPasswordCommand)
export class ResetPasswordHandler implements ICommandHandler<
  ResetPasswordCommand,
  void
> {
  constructor(
    @Inject(PASSWORD_RESET_TOKEN_STORE)
    private readonly tokens: PasswordResetTokenStore,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    @Inject(SESSION_STORE) private readonly sessions: ISessionStore,
  ) {}

  async execute(command: ResetPasswordCommand): Promise<void> {
    const tokenHash = createHash('sha256').update(command.token).digest('hex');
    const userId = await this.tokens.consume(tokenHash, new Date());
    if (!userId) throw new InvalidPasswordResetTokenException();

    const passwordHash = await this.hasher.hash(command.passwordRaw);
    await this.sessions.revokeAllUserSessions(userId);
    const changed = await this.users.changePassword(userId, passwordHash);
    if (!changed) throw new InvalidPasswordResetTokenException();
  }
}
