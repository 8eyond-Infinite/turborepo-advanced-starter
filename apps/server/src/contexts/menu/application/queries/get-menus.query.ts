import { IQuery } from '@nestjs/cqrs';

export class GetMenusQuery implements IQuery {
    public readonly permissions: string[];

    constructor(props: {
        permissions: string[];
    }) {
        this.permissions = props.permissions;
    }
}
