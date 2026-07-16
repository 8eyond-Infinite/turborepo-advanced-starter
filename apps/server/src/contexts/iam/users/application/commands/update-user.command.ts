export class UpdateUserCommand {
    constructor(
        public readonly id: string,
        public readonly email: string,
        public readonly roles: string[],
        public readonly updatedBy?: string,
    ) {}
}
