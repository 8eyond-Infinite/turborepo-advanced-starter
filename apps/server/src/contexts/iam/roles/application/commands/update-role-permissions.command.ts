export class UpdateRolePermissionsCommand {
    constructor(
        public readonly id: string,
        public readonly permissions: string[],
        public readonly updatedBy?: string,
    ) {}
}
