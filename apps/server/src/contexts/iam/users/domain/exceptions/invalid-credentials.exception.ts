import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Errors } from '@repo/contracts';

export class InvalidCredentialsException extends DomainException {
    constructor() {
        super('Invalid credentials', Errors.INVALID_CREDENTIALS);
    }
}
