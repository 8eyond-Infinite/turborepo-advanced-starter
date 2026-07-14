import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class UserNotFoundException extends DomainException {
    constructor(userId: string) {
        super(`User with ID "${userId}" was not found`);
    }
}
