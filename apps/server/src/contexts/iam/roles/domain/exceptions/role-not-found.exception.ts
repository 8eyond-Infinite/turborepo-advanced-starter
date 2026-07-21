import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Errors } from '@repo/contracts';

export class RoleNotFoundException extends DomainException {
    constructor(roleId: string) {
        super(`Role with ID "${roleId}" was not found`, Errors.ROLE_NOT_FOUND, { roleId });
    }
}
