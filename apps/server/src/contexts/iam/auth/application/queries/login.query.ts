export class LoginQuery {
    constructor(
        public readonly email: string,
        public readonly passwordRaw: string,
        public readonly ip?: string,
        public readonly userAgent?: string,
    ) { }
}