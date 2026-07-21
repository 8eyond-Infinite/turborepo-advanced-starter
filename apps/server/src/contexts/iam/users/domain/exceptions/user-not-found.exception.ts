import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Errors } from '@repo/contracts';

export class UserNotFoundException extends DomainException {
    constructor(userId: string) {
        super(`User with ID "${userId}" was not found`, Errors.USER_NOT_FOUND, { userId });
    }
}
