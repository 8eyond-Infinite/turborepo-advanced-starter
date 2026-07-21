import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Errors } from '@repo/contracts';

export class UserDeactivatedException extends DomainException {
    constructor(email: string) {
        super(`User account "${email}" has been deactivated`, Errors.USER_DEACTIVATED, { email });
    }
}
