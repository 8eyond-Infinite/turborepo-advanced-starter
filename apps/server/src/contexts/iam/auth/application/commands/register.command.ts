import { ICommand } from '@nestjs/cqrs';

export class RegisterCommand implements ICommand {
    public readonly email: string;
    public readonly username: string;
    public readonly passwordRaw: string;

    constructor(props: {
        email: string;
        username: string;
        passwordRaw: string;
    }) {
        this.email = props.email;
        this.username = props.username;
        this.passwordRaw = props.passwordRaw;
    }
}