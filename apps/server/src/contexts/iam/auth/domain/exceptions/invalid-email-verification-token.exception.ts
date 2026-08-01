import { Errors } from '@repo/contracts';
import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class InvalidEmailVerificationTokenException extends DomainException {
  constructor() {
    super(
      'Email verification link is invalid or has expired',
      Errors.INVALID_EMAIL_VERIFICATION_TOKEN,
    );
  }
}
