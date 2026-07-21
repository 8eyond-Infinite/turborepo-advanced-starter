import { ICommand } from '@nestjs/cqrs';

export class DeleteRoleCommand implements ICommand {
    public readonly id: string;

    constructor(props: {
        id: string;
    }) {
        this.id = props.id;
    }
}
