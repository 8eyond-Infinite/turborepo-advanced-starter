import { ICommand } from '@nestjs/cqrs';

export class UpdateUserCommand implements ICommand {
    public readonly id: string;
    public readonly email: string;
    public readonly username: string;
    public readonly roles: string[];
    public readonly avatar?: string | null;
    public readonly updatedBy?: string;

    constructor(props: {
        id: string;
        email: string;
        username: string;
        roles: string[];
        avatar?: string | null;
        updatedBy?: string;
    }) {
        this.id = props.id;
        this.email = props.email;
        this.username = props.username;
        this.roles = props.roles;
        this.avatar = props.avatar;
        this.updatedBy = props.updatedBy;
    }
}
