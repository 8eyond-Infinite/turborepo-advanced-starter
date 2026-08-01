import { Errors } from '@repo/contracts';
import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class EmailNotVerifiedException extends DomainException {
  constructor() {
    super('Email address has not been verified', Errors.EMAIL_NOT_VERIFIED);
  }
}
