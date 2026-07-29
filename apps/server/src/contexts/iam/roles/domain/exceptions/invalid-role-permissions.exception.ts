import { Errors } from '@repo/contracts';
import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class InvalidRolePermissionsException extends DomainException {
  constructor(permissionNames: string[]) {
    super(
      `Unknown permissions: ${permissionNames.join(', ')}`,
      Errors.INVALID_ROLE_PERMISSIONS,
      { permissionNames },
    );
  }
}
