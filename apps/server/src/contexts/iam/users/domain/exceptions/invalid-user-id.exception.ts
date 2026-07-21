import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Errors } from '@repo/contracts';

export class InvalidUserIdException extends DomainException {
    constructor() {
        super('User ID cannot be empty', Errors.INVALID_USER_ID);
    }
}
