import { Errors } from '@repo/contracts';
import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class SystemRoleDeleteForbiddenException extends DomainException {
  constructor(roleName: string) {
    super(
      `System role "${roleName}" cannot be deleted`,
      Errors.SYSTEM_ROLE_DELETE_FORBIDDEN,
      { roleName },
    );
  }
}
