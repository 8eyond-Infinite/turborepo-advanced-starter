import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Errors } from '@repo/contracts';

export class InvalidUsernameException extends DomainException {
    constructor(username: string) {
        super(`Invalid username format: "${username}"`, Errors.INVALID_USERNAME, { username });
    }
}
