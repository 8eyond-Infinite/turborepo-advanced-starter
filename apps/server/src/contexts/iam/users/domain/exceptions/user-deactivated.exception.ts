import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class UserDeactivatedException extends DomainException {
    constructor(email: string) {
        super(`User account "${email}" has been deactivated`, { email });
    }
}
