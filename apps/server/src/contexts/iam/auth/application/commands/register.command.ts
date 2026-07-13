export class RegisterCommand {
    constructor(
        public readonly email: string,
        public readonly passwordRaw: string,
    ) { }
}