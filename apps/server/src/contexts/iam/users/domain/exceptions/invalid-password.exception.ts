import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Errors } from '@repo/contracts';

export class InvalidPasswordException extends DomainException {
    constructor() {
        super('Password cannot be empty', Errors.INVALID_PASSWORD);
    }
}
