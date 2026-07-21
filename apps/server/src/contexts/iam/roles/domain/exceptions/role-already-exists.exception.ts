import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Errors } from '@repo/contracts';

export class RoleAlreadyExistsException extends DomainException {
    constructor(name: string) {
        super(`Role with name "${name}" already exists`, Errors.ROLE_ALREADY_EXISTS, { name });
    }
}
