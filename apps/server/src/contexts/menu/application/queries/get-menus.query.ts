import { IQuery } from '@nestjs/cqrs';

export class GetMenusQuery implements IQuery {
    public readonly userId: string;

    constructor(props: {
        userId: string;
    }) {
        this.userId = props.userId;
    }
}
