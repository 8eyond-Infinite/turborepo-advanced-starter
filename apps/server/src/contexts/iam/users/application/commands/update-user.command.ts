export class UpdateUserCommand {
    constructor(
        public readonly id: string,
        public readonly email: string,
        public readonly username: string,
        public readonly roles: string[],
        public readonly avatar?: string | null,
        public readonly updatedBy?: string,
    ) { }
}
