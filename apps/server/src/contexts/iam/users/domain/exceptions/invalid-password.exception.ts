import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class InvalidPasswordException extends DomainException {
    constructor() {
        super('Password cannot be empty');
    }
}
