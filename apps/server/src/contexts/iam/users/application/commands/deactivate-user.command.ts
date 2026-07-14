export class DeactivateUserCommand {
    constructor(
        public readonly id: string,
        public readonly adminId: string,
    ) { }
}
