import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class InvalidUserIdException extends DomainException {
    constructor() {
        super('User ID cannot be empty');
    }
}
