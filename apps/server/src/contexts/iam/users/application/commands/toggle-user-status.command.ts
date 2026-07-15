export class ToggleUserStatusCommand {
    constructor(
        public readonly id: string,
        public readonly adminId?: string,
    ) {}
}
