import { InvalidUsernameException } from '../exceptions/invalid-username.exception';

export class Username {
    constructor(public readonly value: string) {
        if (!value || value.length < 3 || value.length > 50) {
            throw new InvalidUsernameException(value);
        }
    }
}
