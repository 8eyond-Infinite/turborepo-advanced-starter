import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class InvalidUsernameException extends DomainException {
    constructor(username: string) {
        super(`Invalid username format: "${username}"`);
    }
}
