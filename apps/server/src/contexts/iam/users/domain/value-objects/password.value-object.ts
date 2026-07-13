import { InvalidPasswordException } from '../exceptions/invalid-password.exception';

export class Password {
    constructor(public readonly value: string) {
        if (!value) {
            throw new InvalidPasswordException();
        }
    }
}
