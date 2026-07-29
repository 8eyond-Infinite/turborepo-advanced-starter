import { Errors } from '@repo/contracts';
import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class LastAdministratorRequiredException extends DomainException {
  constructor() {
    super(
      'The system must retain at least one active administrator',
      Errors.LAST_ADMINISTRATOR_REQUIRED,
    );
  }
}
