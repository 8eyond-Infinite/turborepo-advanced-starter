import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class UserAlreadyExistsException extends DomainException {
    constructor(email: string) {
        super(`User with email "${email}" already exists`);
    }
}
