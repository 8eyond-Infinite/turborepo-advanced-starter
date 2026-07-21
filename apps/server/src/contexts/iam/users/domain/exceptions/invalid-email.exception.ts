import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Errors } from '@repo/contracts';

export class InvalidEmailException extends DomainException {
    constructor(email: string) {
        super(`Invalid email format: "${email}"`, Errors.INVALID_EMAIL, { email });
    }
}
