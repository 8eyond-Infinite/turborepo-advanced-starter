import { Errors } from '@repo/contracts';
import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class InvalidUserRolesException extends DomainException {
  constructor(unknownRoles: string[]) {
    super(
      'Every user must have at least one valid role',
      Errors.INVALID_USER_ROLES,
      { unknownRoles },
    );
  }
}
