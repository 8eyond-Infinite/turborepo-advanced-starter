import { InvalidEmailException } from '../exceptions/invalid-email.exception';

export class Email {
    constructor(public readonly value: string) {
        if (!value || !value.includes('@')) {
            throw new InvalidEmailException(value);
        }
    }
}
