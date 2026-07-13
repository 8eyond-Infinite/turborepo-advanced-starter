import { InvalidUserIdException } from '../exceptions/invalid-user-id.exception';

export class UserId {
    constructor(public readonly value: string) {
        if (!value) {
            throw new InvalidUserIdException();
        }
    }
}