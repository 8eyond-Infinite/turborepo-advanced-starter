import { ICommand } from '@nestjs/cqrs';

export class CreateUserCommand implements ICommand {
    public readonly email: string;
    public readonly username: string;
    public readonly passwordHash: string;
    public readonly roles: string[];
    public readonly avatar?: string | null;
    public readonly createdBy?: string;

    constructor(props: {
        email: string;
        username: string;
        passwordHash: string;
        roles: string[];
        avatar?: string | null;
        createdBy?: string;
    }) {
        this.email = props.email;
        this.username = props.username;
        this.passwordHash = props.passwordHash;
        this.roles = props.roles;
        this.avatar = props.avatar;
        this.createdBy = props.createdBy;
    }
}
