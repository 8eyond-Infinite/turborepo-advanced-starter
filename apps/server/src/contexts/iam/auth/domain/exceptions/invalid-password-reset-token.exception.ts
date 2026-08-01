import { Errors } from '@repo/contracts';
import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class InvalidPasswordResetTokenException extends DomainException {
  constructor() {
    super(
      'Password reset link is invalid or has expired',
      Errors.INVALID_PASSWORD_RESET_TOKEN,
    );
  }
}
