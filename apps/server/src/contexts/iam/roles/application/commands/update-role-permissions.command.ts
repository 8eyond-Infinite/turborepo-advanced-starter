import { ICommand } from '@nestjs/cqrs';

export class UpdateRolePermissionsCommand implements ICommand {
    public readonly id: string;
    public readonly permissions: string[];
    public readonly updatedBy?: string;

    constructor(props: {
        id: string;
        permissions: string[];
        updatedBy?: string;
    }) {
        this.id = props.id;
        this.permissions = props.permissions;
        this.updatedBy = props.updatedBy;
    }
}
