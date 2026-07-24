import { IQuery } from '@nestjs/cqrs';
import { PermissionType } from '@repo/contracts';

export class GetMenusQuery implements IQuery {
    public readonly permissions: PermissionType[];

    constructor(props: {
        permissions: PermissionType[];
    }) {
        this.permissions = props.permissions;
    }
}

