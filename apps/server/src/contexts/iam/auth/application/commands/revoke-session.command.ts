export class RevokeSessionCommand {
    constructor(
        public readonly userId: string,
        public readonly jti: string,
    ) {}
}
