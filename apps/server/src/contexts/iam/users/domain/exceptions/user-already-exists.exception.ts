import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Errors } from '@repo/contracts';

export class UserAlreadyExistsException extends DomainException {
    constructor(email: string) {
        super(`User with email "${email}" already exists`, Errors.USER_ALREADY_EXISTS, { email });
    }
}
