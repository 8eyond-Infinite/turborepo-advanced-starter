export class LogoutCommand {
    constructor(
        public readonly userId: string,
        public readonly jti: string,
    ) { }
}
