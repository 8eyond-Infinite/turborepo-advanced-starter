import { Errors } from '@repo/contracts';
import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class RoleInUseException extends DomainException {
  constructor(roleName: string, assignedUserCount: number) {
    super(
      `Role "${roleName}" is assigned to ${assignedUserCount} user(s)`,
      Errors.ROLE_IN_USE,
      { roleName, assignedUserCount },
    );
  }
}
