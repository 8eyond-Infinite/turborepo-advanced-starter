export class Password {
    constructor(public readonly value: string) {
        if (!value) {
            throw new Error('Password cannot be empty');
        }
    }
}
