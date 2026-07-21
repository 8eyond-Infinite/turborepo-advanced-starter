import { ICommand } from '@nestjs/cqrs';

export class CreateRoleCommand implements ICommand {
    public readonly name: string;
    public readonly description?: string;
    public readonly createdBy?: string;

    constructor(props: {
        name: string;
        description?: string;
        createdBy?: string;
    }) {
        this.name = props.name;
        this.description = props.description;
        this.createdBy = props.createdBy;
    }
}
